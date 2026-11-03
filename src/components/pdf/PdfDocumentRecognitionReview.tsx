// ============================================================
// PDF FIELD MAPPER
// DOCUMENT-WIDE RECOGNITION REVIEW
// ============================================================
//
// PURPOSE:
//
// Display every interactive PDF widget in a centralized
// document-wide mapping review.
//
// FEATURES:
//
// - Load shared recognition data from Supabase.
// - Recognize approved canonical field names.
// - Recognize previously approved learned aliases.
// - Generate multiple recognition candidates.
// - Display recognition methods and ranking scores.
// - Review and assign draft dictionary mappings.
// - Filter by document page.
// - Filter by mapping status.
// - Search original PDF field names.
// - Display mapping progress.
// - Refresh recognition data without clearing mappings.
//
// IMPORTANT:
//
// - Recognition suggestions are never automatically applied.
// - Draft mappings remain in EditorPage state.
// - No PDF documents are modified.
// - No database learning is performed.
// - No database records are created or updated.
//
// ============================================================

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  getRecognitionCatalog,
} from '../../lib/supabase/recognitionCatalog'

import type {
  RecognitionCatalog,
} from '../../lib/supabase/recognitionCatalog'

import {
  getRecognitionCandidates,
  getRecognitionMethodLabel,
} from '../../lib/pdf/recognizePdfField'

import type {
  InspectedPdfField,
  PdfInspectionResult,
} from '../../lib/pdf/inspectPdf'

// ============================================================
// REVIEW FILTERS
// ============================================================

type MappingStatusFilter =
  | 'all'
  | 'mapped'
  | 'unmapped'

// ============================================================
// COMPONENT PROPERTIES
// ============================================================

interface PdfDocumentRecognitionReviewProps {

  // Complete interactive field inspection results.
  inspection: PdfInspectionResult

  // Draft mappings maintained by EditorPage.
  draftMappings: Record<string, string>

  // Shared PDF widget identity function.
  getWidgetKey: (
    field: InspectedPdfField
  ) => string

  // Update any widget mapping in EditorPage.
  onChangeMapping: (
    field: InspectedPdfField,
    dictionaryKeyId: string | null
  ) => void

}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function PdfDocumentRecognitionReview({

  inspection,

  draftMappings,

  getWidgetKey,

  onChangeMapping,

}: PdfDocumentRecognitionReviewProps) {

  // ==========================================================
  // RECOGNITION CATALOG STATE
  // ==========================================================

  const [catalog, setCatalog] =
    useState<RecognitionCatalog | null>(null)

  const [isLoading, setIsLoading] =
    useState(true)

  const [errorMessage, setErrorMessage] =
    useState('')

  // ==========================================================
  // FILTER STATE
  // ==========================================================

  const [search, setSearch] =
    useState('')

  const [statusFilter, setStatusFilter] =
    useState<MappingStatusFilter>('all')

  const [pageFilter, setPageFilter] =
    useState<number | 'all'>('all')

  // ==========================================================
  // LOAD RECOGNITION CATALOG
  // ==========================================================
  //
  // Retrieve the approved dictionary and active learned
  // aliases through our shared catalog service.
  //
  // The catalog service handles caching and Supabase access.
  //
  // This effect runs when the component mounts.
  //
  // ==========================================================

  useEffect(() => {

    let isMounted = true

    async function loadCatalog() {

      setIsLoading(true)
      setErrorMessage('')

      try {

        const result =
          await getRecognitionCatalog()

        if (!isMounted) {
          return
        }

        setCatalog(result)

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

    return () => {
      isMounted = false
    }

  }, [])

  // ==========================================================
  // REFRESH RECOGNITION DATA
  // ==========================================================
  //
  // Explicitly refresh dictionary and learned-alias data.
  //
  // This does not clear draft mappings.
  //
  // The button is particularly useful during development
  // when new aliases are created in Supabase.
  //
  // ==========================================================

  async function refreshRecognitionData() {

    if (isLoading) {
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    try {

      const result =
        await getRecognitionCatalog({
          forceRefresh: true,
        })

      setCatalog(result)

    } catch (error) {

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to refresh recognition data.'
      )

    } finally {

      setIsLoading(false)

    }

  }

  // ==========================================================
  // RECOGNITION DATA
  // ==========================================================
  //
  // Extract the dictionary keys and learned aliases from
  // the shared Supabase recognition catalog.
  //
  // useMemo preserves stable array references between renders.
  //
  // This prevents unnecessary recalculation of recognition
  // candidates and resolves react-hooks/exhaustive-deps
  // warnings caused by inline empty-array fallbacks.
  //
  // ==========================================================
  
  const dictionaryKeys = useMemo(() => {
  
    return catalog?.dictionaryKeys ?? []
  
  }, [catalog])
  
  const fieldAliases = useMemo(() => {
  
    return catalog?.fieldAliases ?? []
  
  }, [catalog])

  // ==========================================================
  // ACTIVE DICTIONARY KEYS
  // ==========================================================

  const activeKeys = useMemo(() => {

    return dictionaryKeys

      .filter(
        (key) => key.is_active
      )

      .sort(
        (a, b) =>
          a.key_name.localeCompare(
            b.key_name
          )
      )

  }, [dictionaryKeys])

  // ==========================================================
  // DOCUMENT-WIDE RECOGNITION DATA
  // ==========================================================
  //
  // Flatten the page-based inspection results into
  // one collection of interactive PDF widgets.
  //
  // Each widget receives:
  //
  // - Original field information.
  // - Unique widget identity.
  // - Up to five recognition candidates.
  //
  // Candidates now include approved learned aliases.
  //
  // No mappings are automatically applied.
  //
  // ==========================================================

  const reviewRows = useMemo(() => {

    return inspection.pages.flatMap((page) => {

      return page.fields.map((field) => {

        const widgetKey =
          getWidgetKey(field)

        const candidates =
          getRecognitionCandidates(

            field.originalName,

            dictionaryKeys,

            5,

            fieldAliases

          )

        return {

          field,

          widgetKey,

          candidates,

        }

      })

    })

  }, [
    inspection,
    dictionaryKeys,
    fieldAliases,
    getWidgetKey,
  ])

  // ==========================================================
  // DOCUMENT MAPPING STATISTICS
  // ==========================================================

  const totalFields =
    reviewRows.length

  const mappedFields =
    reviewRows.filter(
      (row) =>
        Boolean(
          draftMappings[row.widgetKey]
        )
    ).length

  const unmappedFields =
    totalFields - mappedFields

  const suggestedFields =
    reviewRows.filter(
      (row) =>

        !draftMappings[row.widgetKey] &&

        row.candidates.length > 0

    ).length

  const mappingPercentage =
    totalFields > 0

      ? Math.round(
          (mappedFields / totalFields) * 100
        )

      : 0

  // ==========================================================
  // FILTER REVIEW ROWS
  // ==========================================================

  const filteredRows = useMemo(() => {

    const normalizedSearch =
      search.trim().toLowerCase()

    return reviewRows.filter((row) => {

      const isMapped =
        Boolean(
          draftMappings[row.widgetKey]
        )

      // ------------------------------------------------------
      // PAGE FILTER
      // ------------------------------------------------------

      if (
        pageFilter !== 'all' &&
        row.field.pageNumber !== pageFilter
      ) {

        return false

      }

      // ------------------------------------------------------
      // MAPPING STATUS FILTER
      // ------------------------------------------------------

      if (
        statusFilter === 'mapped' &&
        !isMapped
      ) {

        return false

      }

      if (
        statusFilter === 'unmapped' &&
        isMapped
      ) {

        return false

      }

      // ------------------------------------------------------
      // ORIGINAL FIELD NAME SEARCH
      // ------------------------------------------------------

      if (
        normalizedSearch &&
        !row.field.originalName
          .toLowerCase()
          .includes(normalizedSearch)
      ) {

        return false

      }

      return true

    })

  }, [
    reviewRows,
    draftMappings,
    pageFilter,
    statusFilter,
    search,
  ])

  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="flex flex-wrap items-start justify-between gap-4">

        <div>

          <h2 className="text-base font-semibold text-slate-800">
            Document Recognition Review
          </h2>

          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Review all interactive PDF fields and
            assign their canonical dictionary mappings.
          </p>

        </div>

        <div className="flex flex-wrap items-center gap-2">

          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {inspection.totalWidgets} Interactive Fields
          </span>

          {/* Refresh Recognition Data */}

          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              void refreshRecognitionData()
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >

            {isLoading
              ? 'Loading...'
              : 'Refresh Recognition Data'}

          </button>

        </div>

      </div>

      {/* =====================================================
          RECOGNITION CATALOG STATUS
          ===================================================== */}

      {catalog && (

        <div className="flex flex-wrap gap-3 text-xs text-slate-600">

          <span>
            {activeKeys.length}
            {' '}
            active dictionary keys
          </span>

          <span>
            {fieldAliases.length}
            {' '}
            active learned aliases
          </span>

        </div>

      )}

      {/* =====================================================
          MAPPING STATISTICS
          ===================================================== */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

        {/* Total Fields */}

        <div className="rounded-lg bg-slate-50 p-4">

          <p className="text-xs text-slate-500">
            Total Fields
          </p>

          <p className="mt-2 text-xl font-bold text-slate-800">
            {totalFields}
          </p>

        </div>

        {/* Mapped Fields */}

        <div className="rounded-lg bg-green-50 p-4">

          <p className="text-xs text-green-700">
            Draft Mapped
          </p>

          <p className="mt-2 text-xl font-bold text-green-800">
            {mappedFields}
          </p>

        </div>

        {/* Unmapped Fields */}

        <div className="rounded-lg bg-amber-50 p-4">

          <p className="text-xs text-amber-700">
            Unmapped
          </p>

          <p className="mt-2 text-xl font-bold text-amber-800">
            {unmappedFields}
          </p>

        </div>

        {/* Suggested Fields */}

        <div className="rounded-lg bg-purple-50 p-4">

          <p className="text-xs text-purple-700">
            Suggestions Available
          </p>

          <p className="mt-2 text-xl font-bold text-purple-800">
            {suggestedFields}
          </p>

        </div>

      </div>

      {/* =====================================================
          MAPPING PROGRESS
          ===================================================== */}

      <div>

        <div className="flex items-center justify-between gap-3">

          <p className="text-xs font-semibold text-slate-700">
            Draft Mapping Progress
          </p>

          <p className="text-xs font-semibold text-slate-600">
            {mappingPercentage}%
          </p>

        </div>

        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label="Draft mapping progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={mappingPercentage}
        >

          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{
              width: `${mappingPercentage}%`,
            }}
          />

        </div>

        <p className="mt-2 text-[11px] text-slate-500">
          Progress reflects draft assignments only.
          It does not indicate PDF modification or
          confirmed database learning.
        </p>

      </div>

      {/* =====================================================
          RECOGNITION DATA LOADING
          ===================================================== */}

      {isLoading && (

        <p
          role="status"
          className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600"
        >
          Loading recognition data from Supabase...
        </p>

      )}

      {/* =====================================================
          RECOGNITION DATA ERROR
          ===================================================== */}

      {errorMessage && (

        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage}
        </p>

      )}

      {/* =====================================================
          ALIAS RETRIEVAL WARNING
          =====================================================
          
          The dictionary may still work when alias retrieval
          fails.

          This warning does not disable manual mapping.

          ===================================================== */}

      {catalog?.aliasesError && (

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">

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

      {/* =====================================================
          REVIEW CONTROLS
          ===================================================== */}

      {!isLoading && !errorMessage && (

        <>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

            {/* Field Name Search */}

            <label className="block">

              <span className="text-xs font-semibold text-slate-700">
                Search Fields
              </span>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search original field names..."
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
              />

            </label>

            {/* Page Filter */}

            <label className="block">

              <span className="text-xs font-semibold text-slate-700">
                Document Page
              </span>

              <select
                value={pageFilter}
                onChange={(event) => {

                  const value =
                    event.target.value

                  setPageFilter(
                    value === 'all'
                      ? 'all'
                      : Number(value)
                  )

                }}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >

                <option value="all">
                  All Pages
                </option>

                {inspection.pages.map((page) => (

                  <option
                    key={page.pageNumber}
                    value={page.pageNumber}
                  >
                    Page {page.pageNumber}
                  </option>

                ))}

              </select>

            </label>

            {/* Mapping Status Filter */}

            <label className="block">

              <span className="text-xs font-semibold text-slate-700">
                Mapping Status
              </span>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as MappingStatusFilter
                  )
                }
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >

                <option value="all">
                  All Fields
                </option>

                <option value="mapped">
                  Draft Mapped
                </option>

                <option value="unmapped">
                  Unmapped
                </option>

              </select>

            </label>

          </div>

          {/* =================================================
              FILTERED RESULTS COUNT
              ================================================= */}

          <p className="text-xs text-slate-500">
            Showing {filteredRows.length}
            {' '}
            of {totalFields} fields.
          </p>

          {/* =================================================
              DOCUMENT FIELD REVIEW LIST
              ================================================= */}

          <div className="max-h-[520px] space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">

            {filteredRows.length === 0 && (

              <div className="rounded-lg bg-white p-6 text-center">

                <p className="text-sm text-slate-500">
                  No fields match the selected filters.
                </p>

              </div>

            )}

            {filteredRows.map((row) => {

              const {
                field,
                widgetKey,
                candidates,
              } = row

              // Current draft mapping.
              const currentMappingId =
                draftMappings[widgetKey] ?? ''

              const isMapped =
                Boolean(currentMappingId)

              // Check whether the mapped key is active.
              const currentKeyIsActive =
                activeKeys.some(
                  (key) =>
                    key.id === currentMappingId
                )

              // Suggested key identities.
              const suggestedIds =
                new Set(
                  candidates.map(
                    (candidate) =>
                      candidate.dictionaryKeyId
                  )
                )

              // Remaining approved dictionary keys.
              const otherKeys =
                activeKeys.filter(
                  (key) =>
                    !suggestedIds.has(key.id)
                )

              return (

                <div
                  key={widgetKey}
                  className="rounded-lg border border-slate-200 bg-white p-4"
                >

                  {/* ===========================================
                      FIELD INFORMATION
                      =========================================== */}

                  <div className="flex flex-wrap items-start justify-between gap-3">

                    <div className="min-w-0 flex-1">

                      <p className="break-all font-mono text-sm font-semibold text-slate-800">
                        {field.originalName || '(unnamed)'}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Page {field.pageNumber}
                        {' · '}
                        {field.fieldType}
                        {' · '}
                        Widget {field.widgetIndex}
                      </p>

                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        isMapped
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >

                      {isMapped
                        ? 'Draft Mapped'
                        : 'Unmapped'}

                    </span>

                  </div>

                  {/* ===========================================
                      RECOGNITION INFORMATION
                      =========================================== */}

                  {candidates.length > 0 ? (

                    <div className="mt-3 rounded-lg bg-purple-50 p-3">

                      <p className="text-xs font-semibold text-purple-800">
                        Suggested:
                        {' '}
                        {candidates[0].canonicalKey}
                      </p>

                      <p className="mt-1 text-[11px] text-purple-700">
                        {getRecognitionMethodLabel(
                          candidates[0].method
                        )}
                        {' · '}
                        Rank score:
                        {' '}
                        {candidates[0].score}
                      </p>

                      {candidates.length > 1 && (

                        <p className="mt-1 text-[11px] text-purple-700">
                          {candidates.length - 1}
                          {' '}
                          additional candidate(s) available.
                        </p>

                      )}

                    </div>

                  ) : (

                    <p className="mt-3 text-xs text-slate-500">
                      No recognition suggestions available.
                    </p>

                  )}

                  {/* ===========================================
                      CANONICAL MAPPING SELECTION
                      =========================================== */}

                  <label className="mt-4 block">

                    <span className="text-xs font-semibold text-slate-700">
                      Canonical Mapping
                    </span>

                    <select
                      value={currentMappingId}

                      onChange={(event) => {

                        const dictionaryKeyId =
                          event.target.value

                        onChangeMapping(
                          field,
                          dictionaryKeyId || null
                        )

                      }}

                      aria-label={`Map field ${field.originalName || '(unnamed)'} on page ${field.pageNumber}`}

                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500"
                    >

                      <option value="">
                        -- Not Mapped --
                      </option>

                      {/* Inactive or Missing Mapping */}

                      {currentMappingId &&
                        !currentKeyIsActive && (

                          <option value={currentMappingId}>
                            Previously selected key is unavailable
                          </option>

                        )}

                      {/* =====================================
                          RECOGNITION SUGGESTIONS
                          ===================================== */}

                      {candidates.length > 0 && (

                        <optgroup label="Recognition Suggestions">

                          {candidates.map((candidate) => (

                            <option
                              key={candidate.dictionaryKeyId}
                              value={candidate.dictionaryKeyId}
                            >

                              {candidate.canonicalKey}
                              {' · '}
                              {getRecognitionMethodLabel(
                                candidate.method
                              )}
                              {' · '}
                              {candidate.score}

                            </option>

                          ))}

                        </optgroup>

                      )}

                      {/* =====================================
                          OTHER APPROVED KEYS
                          ===================================== */}

                      <optgroup label="Other Approved Dictionary Keys">

                        {otherKeys.map((key) => (

                          <option
                            key={key.id}
                            value={key.id}
                          >
                            {key.key_name}
                          </option>

                        ))}

                      </optgroup>

                    </select>

                  </label>

                </div>

              )

            })}

          </div>

          {/* =================================================
              REVIEW NOTICE
              ================================================= */}

          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">

            <p className="text-xs leading-relaxed text-blue-800">
              All assignments remain temporary drafts.
              Recognition suggestions require user selection.
              No PDF documents or learned aliases are
              modified by this review.
            </p>

          </div>

        </>

      )}

    </section>

  )

}

export default PdfDocumentRecognitionReview