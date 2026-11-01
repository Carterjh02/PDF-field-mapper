import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
  } from 'react'
  
  import {
    inspectPdf,
    type PdfInspectionResult,
    type InspectedPdfPage,
  } from '../../lib/pdf/inspectPdf'
  
  // ============================================================
  // PDF FIELD MAPPER
  // PDF INSPECTION PANEL
  // ============================================================
  //
  // PURPOSE:
  //
  // Provide a visual testing interface for the PDF
  // inspection service.
  //
  // This is a development-stage component.
  //
  // It reads PDF files locally and displays:
  // - Page information.
  // - Field names.
  // - Field types.
  // - Widget coordinates.
  // - Repeated widget indexes.
  //
  // It does not modify or upload PDFs.
  //
  // ============================================================
  
  // ============================================================
  // UTILITIES
  // ============================================================
  
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`
    }
  
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }
  
    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(2)} MB`
  }
  
  function formatCoordinate(value: number): string {
    return value.toFixed(1)
  }
  
  // ============================================================
  // MAIN COMPONENT
  // ============================================================
  
  export function PdfInspectionPanel() {
    // ----------------------------------------------------------
    // File Picker Reference
    // ----------------------------------------------------------
  
    const fileInputRef =
      useRef<HTMLInputElement | null>(null)
  
    /**
     * Prevent older inspection requests from overwriting
     * the result of a newer file selection.
     */
    const requestIdRef = useRef(0)
  
    // ----------------------------------------------------------
    // State
    // ----------------------------------------------------------
  
    const [inspection, setInspection] =
      useState<PdfInspectionResult | null>(null)
  
    const [selectedPageNumber, setSelectedPageNumber] =
      useState(1)
  
    const [isInspecting, setIsInspecting] =
      useState(false)
  
    const [errorMessage, setErrorMessage] =
      useState('')
  
    // ----------------------------------------------------------
    // Cleanup
    // ----------------------------------------------------------
  
    useEffect(() => {
      return () => {
        requestIdRef.current += 1
      }
    }, [])
  
    // ==========================================================
    // FILE SELECTION
    // ==========================================================
  
    async function handleFileSelected(
        event: ChangeEvent<HTMLInputElement>
      ) {
        // Store the input reference before the asynchronous
        // inspection begins.
        const input = event.currentTarget
      
        const file = input.files?.[0]
      
        if (!file) {
          return
        }
      
        // Reset immediately so the same PDF can be selected
        // again, including after an inspection error.
        input.value = ''
  
      const currentRequest =
        ++requestIdRef.current
  
      setIsInspecting(true)
      setErrorMessage('')
      setInspection(null)
      setSelectedPageNumber(1)
  
      try {
        const result = await inspectPdf(file)
  
        if (
          currentRequest !== requestIdRef.current
        ) {
          return
        }
  
        setInspection(result)
      } catch (error) {
        if (
          currentRequest !== requestIdRef.current
        ) {
          return
        }
  
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to inspect the selected document.'
        )
      } finally {
        if (
          currentRequest === requestIdRef.current
        ) {
          setIsInspecting(false)
        }
      }
    }
  
    // ==========================================================
    // SELECTED PAGE
    // ==========================================================
  
    const selectedPage: InspectedPdfPage | null =
      inspection?.pages.find(
        (page) =>
          page.pageNumber === selectedPageNumber
      ) ?? null
  
    // ==========================================================
    // RENDER
    // ==========================================================
  
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
  
        {/* =====================================================
            HEADER
            ===================================================== */}
  
        <div className="flex flex-wrap items-start justify-between gap-4">
  
          <div>
  
            <h2 className="text-lg font-semibold text-slate-800">
              PDF Structure Inspector
            </h2>
  
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              Inspect the interactive fields and page
              structure of a PDF document.
            </p>
  
          </div>
  
          <button
            type="button"
            disabled={isInspecting}
            onClick={() =>
              fileInputRef.current?.click()
            }
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isInspecting
              ? 'Inspecting...'
              : 'Choose PDF'}
          </button>
  
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(event) => {
              void handleFileSelected(event)
            }}
          />
  
        </div>
  
        {/* =====================================================
            INSPECTION NOTICE
            ===================================================== */}
  
        <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
  
          <p className="text-xs leading-relaxed text-blue-700">
            This tool reads PDF documents locally.
            It does not rename fields, modify the source
            document, or upload PDF files to Supabase.
          </p>
  
        </div>
  
        {/* =====================================================
            ERRORS
            ===================================================== */}
  
        {errorMessage && (
  
          <div
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {errorMessage}
          </div>
  
        )}
  
        {/* =====================================================
            LOADING
            ===================================================== */}
  
        {isInspecting && (
  
          <div
            role="status"
            className="mt-6 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-5"
          >
  
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
  
            <p className="text-sm text-slate-600">
              Reading document structure and
              interactive fields...
            </p>
  
          </div>
  
        )}
  
        {/* =====================================================
            INITIAL STATE
            ===================================================== */}
  
        {!inspection &&
          !isInspecting &&
          !errorMessage && (
  
            <div className="mt-6 rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
  
              <h3 className="text-sm font-semibold text-slate-700">
                No PDF Inspected
              </h3>
  
              <p className="mt-2 text-sm text-slate-500">
                Choose a PDF document to inspect its
                pages and interactive fields.
              </p>
  
            </div>
  
          )}
  
        {/* =====================================================
            INSPECTION RESULTS
            ===================================================== */}
  
        {inspection && !isInspecting && (
  
          <div className="mt-6 space-y-6">
  
            {/* ===================================================
                DOCUMENT INFORMATION
                =================================================== */}
  
            <div>
  
              <h3 className="text-sm font-semibold text-slate-800">
                Document Information
              </h3>
  
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
  
                <div className="rounded-lg bg-slate-50 p-4">
  
                  <p className="text-xs text-slate-500">
                    Pages
                  </p>
  
                  <p className="mt-2 text-2xl font-bold text-slate-800">
                    {inspection.pageCount}
                  </p>
  
                </div>
  
                <div className="rounded-lg bg-slate-50 p-4">
  
                  <p className="text-xs text-slate-500">
                    Field Widgets
                  </p>
  
                  <p className="mt-2 text-2xl font-bold text-slate-800">
                    {inspection.totalWidgets}
                  </p>
  
                </div>
  
                <div className="rounded-lg bg-slate-50 p-4">
  
                  <p className="text-xs text-slate-500">
                    Unique Field Names
                  </p>
  
                  <p className="mt-2 text-2xl font-bold text-slate-800">
                    {inspection.uniqueFieldNames}
                  </p>
  
                </div>
  
                <div className="rounded-lg bg-slate-50 p-4">
  
                  <p className="text-xs text-slate-500">
                    File Size
                  </p>
  
                  <p className="mt-2 text-xl font-bold text-slate-800">
                    {formatFileSize(
                      inspection.fileSize
                    )}
                  </p>
  
                </div>
  
              </div>
  
              <p className="mt-3 break-all text-xs text-slate-500">
                <span className="font-semibold">
                  File:
                </span>{' '}
                {inspection.fileName}
              </p>
  
            </div>
  
            {/* ===================================================
                NO FIELDS WARNING
                =================================================== */}
  
            {inspection.totalWidgets === 0 && (
  
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
  
                <p className="text-sm font-semibold text-amber-800">
                  No Interactive Fields Detected
                </p>
  
                <p className="mt-2 text-xs leading-relaxed text-amber-700">
                  This PDF does not contain detectable
                  interactive form widgets.
  
                  It may be a scanned document,
                  a flattened PDF, an unsupported form
                  type, or an ordinary PDF without form
                  fields.
  
                  We will handle non-interactive documents
                  separately when we develop PDF editing
                  and OCR functionality.
                </p>
  
              </div>
  
            )}
  
            {/* ===================================================
                PAGE SELECTION
                =================================================== */}
  
            <div>
  
              <h3 className="text-sm font-semibold text-slate-800">
                Document Pages
              </h3>
  
              <div className="mt-3 flex flex-wrap gap-2">
  
                {inspection.pages.map((page) => (
  
                  <button
                    key={page.pageNumber}
                    type="button"
                    onClick={() =>
                      setSelectedPageNumber(
                        page.pageNumber
                      )
                    }
                    className={
                      selectedPageNumber === page.pageNumber
                        ? 'rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white'
                        : 'rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50'
                    }
                  >
                    Page {page.pageNumber}
  
                    <span className="ml-2 opacity-75">
                      ({page.fields.length})
                    </span>
  
                  </button>
  
                ))}
  
              </div>
  
            </div>
  
            {/* ===================================================
                PAGE DETAILS
                =================================================== */}
  
            {selectedPage && (
  
              <div className="overflow-hidden rounded-xl border border-slate-200">
  
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
  
                  <div>
  
                    <h3 className="text-sm font-semibold text-slate-800">
                      Page {selectedPage.pageNumber}
                    </h3>
  
                    <p className="mt-1 text-xs text-slate-500">
                      {formatCoordinate(
                        selectedPage.width
                      )}{' '}
                      ×{' '}
                      {formatCoordinate(
                        selectedPage.height
                      )}{' '}
                      viewport units
                      {' · '}
                      Rotation: {selectedPage.rotation}°
                    </p>
  
                  </div>
  
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {selectedPage.fields.length}{' '}
                    widgets
                  </span>
  
                </div>
  
                {/* ===============================================
                    FIELDS TABLE
                    =============================================== */}
  
                {selectedPage.fields.length === 0 ? (
  
                  <div className="p-8 text-center text-sm text-slate-500">
                    No interactive fields were detected
                    on this page.
                  </div>
  
                ) : (
  
                  <div className="max-h-[520px] overflow-auto">
  
                    <table className="w-full min-w-[700px] text-left">
  
                      <thead className="sticky top-0 bg-slate-50">
  
                        <tr className="border-b border-slate-200">
  
                          <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                            Original Field Name
                          </th>
  
                          <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                            Type
                          </th>
  
                          <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                            Widget
                          </th>
  
                          <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                            Position
                          </th>
  
                          <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                            Size
                          </th>
  
                        </tr>
  
                      </thead>
  
                      <tbody>
  
                        {selectedPage.fields.map((field) => (
  
                          <tr
                            key={`${field.id}-${field.widgetIndex}`}
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                          >
  
                            <td className="px-4 py-3">
  
                              <span className="block break-all font-mono text-xs font-semibold text-slate-700">
                                {field.originalName ||
                                  '(unnamed)'}
                              </span>
  
                              {(field.required ||
                                field.readOnly) && (
  
                                <span className="mt-1 block text-xs text-slate-400">
  
                                  {field.required &&
                                    'Required '}
  
                                  {field.readOnly &&
                                    'Read Only'}
  
                                </span>
  
                              )}
  
                            </td>
  
                            <td className="px-4 py-3 text-xs capitalize text-slate-600">
                              {field.fieldType}
                            </td>
  
                            <td className="px-4 py-3 font-mono text-xs text-slate-600">
                              {field.widgetIndex}
                            </td>
  
                            <td className="px-4 py-3 font-mono text-xs text-slate-600">
                              {formatCoordinate(
                                field.x
                              )}
                              ,{' '}
                              {formatCoordinate(
                                field.y
                              )}
                            </td>
  
                            <td className="px-4 py-3 font-mono text-xs text-slate-600">
                              {formatCoordinate(
                                field.width
                              )}
                              {' × '}
                              {formatCoordinate(
                                field.height
                              )}
                            </td>
  
                          </tr>
  
                        ))}
  
                      </tbody>
  
                    </table>
  
                  </div>
  
                )}
  
              </div>
  
            )}
  
          </div>
  
        )}
  
      </section>
    )
  }
  
  export default PdfInspectionPanel