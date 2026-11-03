// ============================================================
// PDF FIELD MAPPER
// DICTIONARY MAPPING PANEL
// ============================================================
//
// PURPOSE:
//
// Allow users to review recognition suggestions and assign
// approved canonical dictionary keys to PDF fields.
//
// FEATURES:
//
// - Use the shared recognition catalog.
// - Recognize approved global learned aliases.
// - Display multiple recognition candidates.
// - Display recognition methods and ranking scores.
// - Search approved dictionary keys.
// - Assign and clear draft mappings.
// - Automatically receive refreshed recognition data.
//
// IMPORTANT:
//
// Recognition suggestions are never applied automatically.
//
// Draft mappings are managed by EditorPage.
//
// No PDF modifications occur here.
//
// No database learning or mapping writes occur here.
//
// ============================================================

import {
  useEffect,
  useState,
} from 'react'

import {
  getRecognitionCatalog,
  getCachedRecognitionCatalog,
  subscribeRecognitionCatalog,
  type RecognitionCatalog,
} from '../../lib/supabase/recognitionCatalog'

import {
  getRecognitionCandidates,
  getRecognitionMethodLabel,
} from '../../lib/pdf/recognizePdfField'

import type {
  InspectedPdfField,
} from '../../lib/pdf/inspectPdf'

// ============================================================
// COMPONENT PROPERTIES
// ============================================================

interface PdfFieldMappingPanelProps {

  selectedField: InspectedPdfField | null

  selectedDictionaryKeyId: string | null

  draftMappingCount: number

  onChangeMapping: (
    dictionaryKeyId: string | null
  ) => void

}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function PdfFieldMappingPanel({

  selectedField,

  selectedDictionaryKeyId,

  draftMappingCount,

  onChangeMapping,

}: PdfFieldMappingPanelProps) {

  // ==========================================================
  // RECOGNITION CATALOG STATE
  // ==========================================================
  //
  // Initialize from the shared cache when available.
  //
  // The catalog includes:
  //
  // - Canonical dictionary keys.
  // - Active learned aliases.
  // - Nonfatal alias retrieval errors.
  //
  // ==========================================================

  const [catalog, setCatalog] =
    useState<RecognitionCatalog | null>(
      () => getCachedRecognitionCatalog()
    )

  const [isLoading, setIsLoading] =
    useState(false)

  const [errorMessage, setErrorMessage] =
    useState('')

  // ==========================================================
  // DICTIONARY SEARCH STATE
  // ==========================================================

  const [search, setSearch] =
    useState('')

  // ==========================================================
  // LOAD AND SUBSCRIBE TO RECOGNITION CATALOG
  // ==========================================================
  //
  // The shared catalog service handles Supabase retrieval,
  // caching, and request deduplication.
  //
  // This component subscribes to successful catalog updates.
  //
  // When Document Recognition Review refreshes data,
  // the updated catalog is automatically received here.
  //
  // IMPORTANT:
  //
  // Subscribe before requesting data so that updates
  // occurring during the initial load are not missed.
  //
  // ==========================================================

  useEffect(() => {

    let isMounted = true

    // --------------------------------------------------------
    // SUBSCRIBE TO CATALOG UPDATES
    // --------------------------------------------------------

    const unsubscribe =
      subscribeRecognitionCatalog(
        (updatedCatalog) => {

          if (!isMounted) {
            return
          }

          setCatalog(updatedCatalog)

          setErrorMessage('')

        }
      )

    // --------------------------------------------------------
    // LOAD INITIAL CATALOG
    // --------------------------------------------------------

    async function loadCatalog() {

      // A cached catalog may already be available because
      // another Editor component loaded it first.
      const cached =
        getCachedRecognitionCatalog()

      if (cached) {

        setCatalog(cached)

      } else {

        setIsLoading(true)

      }

      try {

        const result =
          await getRecognitionCatalog()

        if (!isMounted) {
          return
        }

        // A newer refresh may have completed while this
        // request was pending. Prefer the current cache.
        const latest =
          getCachedRecognitionCatalog()

        setCatalog(latest ?? result)

        setErrorMessage('')

      } catch (error) {

        if (!isMounted) {
          return
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load recognition data.'
        )

      } finally {

        if (isMounted) {

          setIsLoading(false)

        }

      }

    }

    void loadCatalog()

    // --------------------------------------------------------
    // CLEANUP
    // --------------------------------------------------------

    return () => {

      isMounted = false

      unsubscribe()

    }

  }, [])

  // ==========================================================
  // RECOGNITION DATA
  // ==========================================================

  const dictionaryKeys =
    catalog?.dictionaryKeys ?? []

  const fieldAliases =
    catalog?.fieldAliases ?? []

  // ==========================================================
  // ACTIVE DICTIONARY KEYS
  // ==========================================================
  //
  // Only active canonical keys are available for new
  // mappings.
  //
  // Inactive keys remain in the complete catalog for
  // identifying previously selected mappings.
  //
  // ==========================================================

  const activeKeys = dictionaryKeys

    .filter(
      (key) => key.is_active
    )

    .sort(
      (a, b) =>
        a.key_name.localeCompare(
          b.key_name
        )
    )

  // ==========================================================
  // DICTIONARY SEARCH
  // ==========================================================

  const normalizedSearch =
    search.trim().toLowerCase()

  const filteredKeys = activeKeys.filter(
    (key) => {

      if (!normalizedSearch) {
        return true
      }

      const matchesSearch =

        key.key_name
          .toLowerCase()
          .includes(normalizedSearch) ||

        key.display_name
          .toLowerCase()
          .includes(normalizedSearch) ||

        key.category
          .toLowerCase()
          .includes(normalizedSearch)

      // Keep the selected key visible even when
      // it doesn't match the search term.
      return (
        matchesSearch ||
        key.id === selectedDictionaryKeyId
      )

    }
  )

  // ==========================================================
  // CURRENT DRAFT MAPPING
  // ==========================================================

  const selectedDictionaryKey =
    dictionaryKeys.find(
      (key) =>
        key.id === selectedDictionaryKeyId
    ) ?? null

  // ==========================================================
  // RECOGNITION CANDIDATES
  // ==========================================================
  //
  // Recognition combines:
  //
  // - Exact canonical names.
  // - Normalized canonical names.
  // - Display-name matching.
  // - Controlled synonyms.
  // - Partial word matching.
  // - Approved global learned aliases.
  //
  // All candidates require explicit user selection.
  //
  // ==========================================================

  const recognitionCandidates =

    selectedField &&
    catalog &&
    !errorMessage

      ? getRecognitionCandidates(
          selectedField.originalName,
          dictionaryKeys,
          8,
          fieldAliases
        )

      : []

  // ==========================================================
  // APPLY RECOGNITION CANDIDATE
  // ==========================================================

  function applyCandidate(
    dictionaryKeyId: string
  ) {

    onChangeMapping(dictionaryKeyId)

    setSearch('')

  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="flex flex-wrap items-start justify-between gap-3">

        <div>

          <h2 className="text-base font-semibold text-slate-800">
            Dictionary Mapping
          </h2>

          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Review suggested mappings or select a
            canonical dictionary key manually.
          </p>

        </div>

        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {draftMappingCount} Draft Mappings
        </span>

      </div>

      {/* =====================================================
          DEVELOPMENT NOTICE
          ===================================================== */}

      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">

        <p className="text-xs leading-relaxed text-blue-800">
          Mappings are temporary drafts.
          Suggestions must be applied manually.
          No PDF changes or database learning occur yet.
        </p>

      </div>

      {/* =====================================================
          NO FIELD SELECTED
          ===================================================== */}

      {!selectedField && (

        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center">

          <p className="text-sm font-semibold text-slate-700">
            No Field Selected
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Select a field on the PDF or from the
            Document Fields list.
          </p>

        </div>

      )}

      {/* =====================================================
          SELECTED FIELD
          ===================================================== */}

      {selectedField && (

        <div className="space-y-5">

          {/* =================================================
              ORIGINAL PDF FIELD
              ================================================= */}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">

            <p className="text-xs font-medium text-slate-500">
              Original PDF Field
            </p>

            <p className="mt-2 break-all font-mono text-sm font-semibold text-slate-800">
              {selectedField.originalName || '(unnamed)'}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Page {selectedField.pageNumber}
              {' · '}
              {selectedField.fieldType}
              {' · '}
              Widget {selectedField.widgetIndex}
            </p>

          </div>

          {/* =================================================
              RECOGNITION DATA LOADING
              ================================================= */}

          {isLoading && (

            <p
              role="status"
              className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500"
            >
              Loading recognition data...
            </p>

          )}

          {/* =================================================
              RECOGNITION DATA ERROR
              ================================================= */}

          {errorMessage && (

            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
            >
              {errorMessage}
            </p>

          )}

          {/* =================================================
              LEARNED ALIAS WARNING
              =================================================
              
              Alias retrieval errors do not prevent
              dictionary recognition or manual mapping.

              ================================================= */}

          {catalog?.aliasesError && (

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">

              <p className="text-xs font-semibold text-amber-800">
                Learned Aliases Unavailable
              </p>

              <p className="mt-2 text-xs leading-relaxed text-amber-700">
                {catalog.aliasesError}
              </p>

              <p className="mt-2 text-xs text-amber-700">
                Canonical recognition and manual mapping
                remain available.
              </p>

            </div>

          )}

          {/* =================================================
              RECOGNITION CANDIDATES
              ================================================= */}

          {catalog && !errorMessage && (

            <div className="space-y-3">

              <div className="flex items-center justify-between gap-2">

                <h3 className="text-xs font-semibold text-slate-800">
                  Recognition Suggestions
                </h3>

                <span className="rounded-full bg-purple-100 px-2 py-1 text-[10px] font-semibold text-purple-700">
                  {recognitionCandidates.length} Candidates
                </span>

              </div>

              {recognitionCandidates.length === 0 ? (

                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">

                  <p className="text-xs leading-relaxed text-slate-600">
                    No matching dictionary candidates were
                    found. Use manual mapping below.
                  </p>

                </div>

              ) : (

                <div className="space-y-2">

                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Candidates are ranked by name similarity
                    and approved aliases. Review the field's
                    meaning before applying a mapping.
                  </p>

                  {recognitionCandidates.map(
                    (candidate, index) => {

                      const isCurrentMapping =
                        candidate.dictionaryKeyId ===
                        selectedDictionaryKeyId

                      return (

                        <div
                          key={candidate.dictionaryKeyId}
                          className={`rounded-lg border p-3 ${
                            isCurrentMapping
                              ? 'border-green-300 bg-green-50'
                              : 'border-purple-100 bg-purple-50'
                          }`}
                        >

                          {/* Candidate Header */}

                          <div className="flex items-start justify-between gap-2">

                            <div className="min-w-0">

                              <p className="text-[10px] font-semibold text-slate-500">
                                Candidate {index + 1}
                              </p>

                              <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-800">
                                {candidate.canonicalKey}
                              </p>

                              <p className="mt-1 text-[11px] text-slate-600">
                                {candidate.displayName}
                              </p>

                            </div>

                            <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-purple-700">
                              {candidate.score}
                            </span>

                          </div>

                          {/* Recognition Method */}

                          <p className="mt-3 text-[11px] text-slate-600">
                            {getRecognitionMethodLabel(
                              candidate.method
                            )}
                          </p>

                          {/* Apply Mapping */}

                          {isCurrentMapping ? (

                            <span className="mt-3 inline-block rounded-lg bg-green-100 px-3 py-2 text-[11px] font-semibold text-green-800">
                              Currently Mapped
                            </span>

                          ) : (

                            <button
                              type="button"
                              onClick={() =>
                                applyCandidate(
                                  candidate.dictionaryKeyId
                                )
                              }
                              className="mt-3 rounded-lg bg-purple-700 px-3 py-2 text-[11px] font-semibold text-white hover:bg-purple-800"
                            >
                              Apply Mapping
                            </button>

                          )}

                        </div>

                      )

                    }
                  )}

                </div>

              )}

            </div>

          )}

          {/* =================================================
              MANUAL DICTIONARY MAPPING
              ================================================= */}

          {catalog && !errorMessage && (

            <div className="space-y-4 border-t border-slate-200 pt-4">

              <h3 className="text-xs font-semibold text-slate-800">
                Manual Mapping
              </h3>

              {/* Dictionary Search */}

              <div>

                <label
                  htmlFor="pdf-dictionary-search"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Search Dictionary
                </label>

                <input
                  id="pdf-dictionary-search"
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search canonical fields..."
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-2 text-[11px] text-slate-500">
                  {filteredKeys.length} available options
                </p>

              </div>

              {/* Canonical Dictionary Selection */}

              <div>

                <label
                  htmlFor="pdf-dictionary-mapping"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Canonical Dictionary Key
                </label>

                <select
                  id="pdf-dictionary-mapping"
                  value={
                    selectedDictionaryKey?.is_active
                      ? selectedDictionaryKeyId ?? ''
                      : ''
                  }
                  onChange={(event) => {

                    onChangeMapping(
                      event.target.value || null
                    )

                    setSearch('')

                  }}
                  disabled={activeKeys.length === 0}
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
                >

                  <option value="">
                    -- No Mapping --
                  </option>

                  {filteredKeys.map((key) => (

                    <option
                      key={key.id}
                      value={key.id}
                    >
                      {key.key_name}
                      {' — '}
                      {key.display_name}
                    </option>

                  ))}

                </select>

              </div>

            </div>

          )}

          {/* =================================================
              CURRENT DRAFT MAPPING
              ================================================= */}

          {selectedDictionaryKey && (

            <div className="rounded-lg border border-green-200 bg-green-50 p-4">

              <p className="text-xs font-semibold text-green-800">
                Current Draft Mapping
              </p>

              <p className="mt-2 break-all font-mono text-sm font-semibold text-green-900">
                {selectedDictionaryKey.key_name}
              </p>

              <p className="mt-1 text-xs text-green-800">
                {selectedDictionaryKey.display_name}
              </p>

              {!selectedDictionaryKey.is_active && (

                <p className="mt-3 text-xs font-semibold text-amber-800">
                  This dictionary key is inactive.
                </p>

              )}

              <button
                type="button"
                onClick={() =>
                  onChangeMapping(null)
                }
                className="mt-4 rounded-lg border border-green-300 bg-white px-3 py-2 text-xs font-semibold text-green-800 hover:bg-green-100"
              >
                Clear Mapping
              </button>

            </div>

          )}

          {/* =================================================
              MISSING DICTIONARY KEY
              ================================================= */}

          {!selectedDictionaryKey &&
            selectedDictionaryKeyId && (

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">

                <p className="text-xs text-amber-800">
                  The selected dictionary mapping could
                  not be found.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    onChangeMapping(null)
                  }
                  className="mt-3 text-xs font-semibold text-amber-800 underline"
                >
                  Clear Mapping
                </button>

              </div>

            )}

        </div>

      )}

    </section>

  )

}

export default PdfFieldMappingPanel