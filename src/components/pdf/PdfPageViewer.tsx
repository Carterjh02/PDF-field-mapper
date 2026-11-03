// ============================================================
// PDF FIELD MAPPER
// PDF PAGE VIEWER
// ============================================================
//
// PURPOSE:
//
// Provides the functional PDF viewing component used by
// the main EditorPage.
//
// RESPONSIBILITIES:
//
// - Open PDF documents locally.
// - Render PDF pages using PDF.js.
// - Navigate between document pages.
// - Support PDF zooming.
// - Inspect interactive PDF fields.
// - Display interactive field overlays.
// - Allow users to select PDF fields.
// - Report document information to EditorPage.
//
// STATE ARCHITECTURE:
//
// PdfPageViewer manages:
// - Active PDF document
// - Current page
// - Zoom level
// - PDF inspection results
// - Loading and rendering status
// - Field overlay visibility
//
// EditorPage manages:
// - Selected PDF field
// - Draft dictionary mappings
// - Field inspector
// - Dictionary mapping panel
// - Document fields list
//
// IMPORTANT:
//
// - Original PDF files are never modified here.
// - No PDF data is uploaded to Supabase.
// - No dictionary mappings are saved to the database.
// - PDF writing will be implemented separately.
//
// ============================================================

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'

import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from 'pdfjs-dist'

import {
  configurePdfJsWorker,
  inspectPdf,
  withPdfDeadline,
  type InspectedPdfField,
  type PdfInspectionResult,
} from '../../lib/pdf/inspectPdf'

import {
  PdfFieldOverlay,
} from './PdfFieldOverlay'

// ============================================================
// PDF.JS CONFIGURATION
// ============================================================
//
// Configure the worker used for PDF rendering and inspection.
//
// This uses the configuration established in inspectPdf.ts.
//
// PDF.js version: 4.10.38
//
// ============================================================

configurePdfJsWorker()

// ============================================================
// VIEWER CONFIGURATION
// ============================================================

// Supported zoom levels.
const ZOOM_LEVELS = [
  0.75,
  1,
  1.25,
  1.5,
  2,
]

// ============================================================
// VIEWER INFORMATION
// ============================================================
//
// This interface defines the information that PdfPageViewer
// shares with EditorPage.
//
// EditorPage uses these values to populate its right-hand
// inspector and document fields list.
//
// ============================================================

export interface PdfViewerInfo {

  // Name of the currently opened PDF.
  fileName: string | null

  // Current page displayed in the viewer.
  pageNumber: number

  // Total number of pages in the PDF.
  pageCount: number

  // Results returned by the PDF inspection service.
  inspection: PdfInspectionResult | null

  // Whether the document is currently opening.
  isOpening: boolean

  // Whether interactive fields are being inspected.
  isInspecting: boolean

}

// ============================================================
// PDF PAGE VIEWER PROPERTIES
// ============================================================
//
// The viewer owns the original PDF File object.
//
// EditorPage receives that File through onSourceFileChange,
// allowing it to send the original bytes to Electron
// when the user saves the modified document.
//
// No PDF modifications occur inside this component.
//
// ============================================================

interface PdfPageViewerProps {

  selectedField: InspectedPdfField | null

  onSelectField: (
    field: InspectedPdfField | null
  ) => void

  onClearDraftMappings: () => void

  onViewerInfoChange: (
    info: PdfViewerInfo
  ) => void

  // NEW: Notify the Editor when the source PDF changes.
  onSourceFileChange: (
    file: File | null
  ) => void

}

// ============================================================
// MAIN PDF VIEWER COMPONENT
// ============================================================

export function PdfPageViewer({

  selectedField,

  onSelectField,

  onClearDraftMappings,

  onViewerInfoChange,

  onSourceFileChange,

}: PdfPageViewerProps) {

  // ==========================================================
  // REFERENCES
  // ==========================================================

  // Hidden file input used to open local PDF documents.
  const inputRef =
    useRef<HTMLInputElement>(null)

  // Canvas used for rendering PDF pages.
  const canvasRef =
    useRef<HTMLCanvasElement>(null)

  // Allows an ongoing inspection to be cancelled.
  const inspectionAbortRef =
    useRef<AbortController | null>(null)

  // ==========================================================
  // DOCUMENT STATE
  // ==========================================================

  const [file, setFile] =
    useState<File | null>(null)

  const [document, setDocument] =
    useState<PDFDocumentProxy | null>(null)

  const [pageNumber, setPageNumber] =
    useState(1)

  const [zoomIndex, setZoomIndex] =
    useState(1)

  // ==========================================================
  // LOADING STATE
  // ==========================================================

  const [isOpening, setIsOpening] =
    useState(false)

  const [isRendering, setIsRendering] =
    useState(false)

  const [viewerError, setViewerError] =
    useState('')

  // ==========================================================
  // PDF INSPECTION STATE
  // ==========================================================

  const [inspection, setInspection] =
    useState<PdfInspectionResult | null>(null)

  const [inspectionMessage, setInspectionMessage] =
    useState('')

  const [inspectionError, setInspectionError] =
    useState('')

  const [isInspecting, setIsInspecting] =
    useState(false)

  // ==========================================================
  // FIELD OVERLAY STATE
  // ==========================================================

  // Controls visibility of interactive field rectangles.
  const [showFieldOverlays, setShowFieldOverlays] =
    useState(true)

  // ==========================================================
  // SHARE VIEWER INFORMATION WITH EDITOR PAGE
  // ==========================================================
  //
  // Whenever the active document, current page, or inspection
  // state changes, notify EditorPage.
  //
  // This allows the parent component to display:
  //
  // - Document filename
  // - Current page information
  // - Interactive field counts
  // - Fields belonging to the current page
  // - Loading and inspection status
  //
  // EditorPage supplies a stable callback using useCallback.
  //
  // ==========================================================

  useEffect(() => {

    onViewerInfoChange({

      fileName: file?.name ?? null,

      pageNumber,

      pageCount: document?.numPages ?? 0,

      inspection,

      isOpening,

      isInspecting,

    })

  }, [
    file,
    pageNumber,
    document,
    inspection,
    isOpening,
    isInspecting,
    onViewerInfoChange,
  ])

  // ==========================================================
  // OPEN PDF DOCUMENT
  // ==========================================================
  //
  // This effect runs whenever a different PDF file is
  // selected.
  //
  // The PDF is read locally and opened using PDF.js.
  //
  // Detailed diagnostic logging is preserved from our
  // previous debugging milestone.
  //
  // ==========================================================

  useEffect(() => {

    // No PDF has been selected.
    if (!file) {
      return
    }

    const selectedFile = file

    let cancelled = false

    let loadingTask:
      ReturnType<typeof getDocument> | null = null

    const controller = new AbortController()

    // --------------------------------------------------------
    // Open Selected PDF
    // --------------------------------------------------------

    async function openFile() {

      const startTime = performance.now()

      console.log(
        '[PDF Viewer] ======================================='
      )

      console.log(
        '[PDF Viewer] Starting PDF document load'
      )

      console.log(
        '[PDF Viewer] File name:',
        selectedFile.name
      )

      console.log(
        '[PDF Viewer] File size:',
        selectedFile.size,
        'bytes'
      )

      console.log(
        '[PDF Viewer] Renderer URL:',
        window.location.href
      )

      console.log(
        '[PDF Viewer] PDF.js worker URL:',
        GlobalWorkerOptions.workerSrc
      )

      // Reset document loading state.
      setIsOpening(true)
      setViewerError('')
      setDocument(null)

      try {

        // ====================================================
        // STEP 1: READ LOCAL PDF FILE
        // ====================================================

        console.log(
          '[PDF Viewer] STEP 1: Reading PDF file...'
        )

        const fileReadStart =
          performance.now()

        const bytes = await withPdfDeadline(
          selectedFile.arrayBuffer(),
          'reading PDF file',
          controller.signal
        )

        console.log(
          '[PDF Viewer] STEP 1 COMPLETE'
        )

        console.log(
          '[PDF Viewer] File read duration:',
          Math.round(
            performance.now() - fileReadStart
          ),
          'ms'
        )

        console.log(
          '[PDF Viewer] Loaded bytes:',
          bytes.byteLength
        )

        if (cancelled) {
          return
        }

        // ====================================================
        // STEP 2: INITIALIZE PDF.JS
        // ====================================================

        console.log(
          '[PDF Viewer] STEP 2: Initializing PDF.js...'
        )

        loadingTask = getDocument({
          data: new Uint8Array(bytes),
        })

        console.log(
          '[PDF Viewer] STEP 2 COMPLETE: Loading task created.'
        )

        // ----------------------------------------------------
        // PDF.js Loading Progress
        // ----------------------------------------------------

        loadingTask.onProgress = (
          progress: {
            loaded: number
            total: number
          }
        ) => {

          if (!cancelled) {

            console.log(
              '[PDF Viewer] PDF.js loading progress:',
              progress.loaded,
              '/',
              progress.total
            )

          }

        }

        // ====================================================
        // STEP 3: OPEN PDF DOCUMENT
        // ====================================================

        console.log(
          '[PDF Viewer] STEP 3: Waiting for PDF.js to open document...'
        )

        const pdfOpenStart =
          performance.now()

        const pdf = await withPdfDeadline(
          loadingTask.promise,
          'opening PDF for viewing',
          controller.signal
        )

        console.log(
          '[PDF Viewer] STEP 3 COMPLETE'
        )

        console.log(
          '[PDF Viewer] PDF open duration:',
          Math.round(
            performance.now() - pdfOpenStart
          ),
          'ms'
        )

        console.log(
          '[PDF Viewer] Total pages:',
          pdf.numPages
        )

        // ====================================================
        // STEP 4: UPDATE VIEWER STATE
        // ====================================================

        if (!cancelled) {

          console.log(
            '[PDF Viewer] STEP 4: Updating viewer state...'
          )

          setDocument(pdf)

          console.log(
            '[PDF Viewer] STEP 4 COMPLETE'
          )

        }

      } catch (error) {

        // ====================================================
        // PDF LOADING ERROR
        // ====================================================

        console.error(
          '[PDF Viewer] PDF LOADING FAILED'
        )

        console.error(
          '[PDF Viewer] Error details:',
          error
        )

        console.error(
          '[PDF Viewer] Worker URL at failure:',
          GlobalWorkerOptions.workerSrc
        )

        console.error(
          '[PDF Viewer] Time elapsed:',
          Math.round(
            performance.now() - startTime
          ),
          'ms'
        )

        if (!cancelled) {

          setViewerError(
            error instanceof Error
              ? error.message
              : 'Unable to open PDF.'
          )

        }

      } finally {

        console.log(
          '[PDF Viewer] Open operation finished.'
        )

        console.log(
          '[PDF Viewer] Total elapsed time:',
          Math.round(
            performance.now() - startTime
          ),
          'ms'
        )

        console.log(
          '[PDF Viewer] ======================================='
        )

        if (!cancelled) {
          setIsOpening(false)
        }

      }

    }

    // Begin opening the document.
    void openFile()

    // --------------------------------------------------------
    // PDF Loading Cleanup
    // --------------------------------------------------------
    //
    // Runs when another PDF is selected or the component
    // unmounts.
    //
    // Initiates PDF.js cleanup without waiting indefinitely
    // for a stalled worker.
    //
    // --------------------------------------------------------

    return () => {

      cancelled = true

      controller.abort()

      if (loadingTask) {

        console.log(
          '[PDF Viewer] Cleaning up PDF loading task.'
        )

        try {

          void loadingTask.destroy().catch(
            (error: unknown) => {

              console.warn(
                '[PDF Viewer] PDF.js cleanup warning:',
                error
              )

            }
          )

        } catch (error) {

          console.warn(
            '[PDF Viewer] Synchronous cleanup warning:',
            error
          )

        }

      }

    }

  }, [file])

  // ==========================================================
  // RENDER CURRENT PDF PAGE
  // ==========================================================
  //
  // Runs when:
  //
  // - A PDF finishes opening.
  // - The page number changes.
  // - The zoom level changes.
  //
  // The rendered canvas uses PDF.js viewport coordinates.
  //
  // This maintains compatibility with the field rectangles
  // extracted by inspectPdf.ts.
  //
  // ==========================================================

  useEffect(() => {

    if (!document) {
      return
    }

    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    // Capture the values used by this rendering operation.
    const activeDocument = document
    const activeCanvas = canvas

    let cancelled = false

    let cancelRender:
      (() => void) | null = null

    async function renderPage() {

      console.log(
        '[PDF Viewer] Starting page render:',
        pageNumber
      )

      setIsRendering(true)
      setViewerError('')

      try {

        // ====================================================
        // LOAD PDF PAGE
        // ====================================================

        console.log(
          '[PDF Viewer] Retrieving page:',
          pageNumber
        )

        const page = await withPdfDeadline(
          activeDocument.getPage(pageNumber),
          `opening page ${pageNumber}`
        )

        if (cancelled) {
          return
        }

        console.log(
          '[PDF Viewer] Page retrieved successfully.'
        )

        // ====================================================
        // CALCULATE VIEWPORT
        // ====================================================

        const viewport = page.getViewport({
          scale: ZOOM_LEVELS[zoomIndex],
        })

        const ratio = Math.min(
          window.devicePixelRatio || 1,
          2
        )

        // ====================================================
        // CONFIGURE CANVAS
        // ====================================================

        activeCanvas.width = Math.ceil(
          viewport.width * ratio
        )

        activeCanvas.height = Math.ceil(
          viewport.height * ratio
        )

        activeCanvas.style.width =
          `${viewport.width}px`

        activeCanvas.style.height =
          `${viewport.height}px`

        const context =
          activeCanvas.getContext('2d')

        if (!context) {

          throw new Error(
            'Unable to create the PDF canvas.'
          )

        }

        // ====================================================
        // RENDER PDF PAGE
        // ====================================================
        //
        // PDF.js 4 uses canvasContext.
        //
        // Do not add the newer "canvas" property because
        // it is not supported by our installed PDF.js version.
        //
        // ====================================================

        console.log(
          '[PDF Viewer] Rendering page to canvas...'
        )

        const task = page.render({

          canvasContext: context,

          viewport,

          transform: [
            ratio,
            0,
            0,
            ratio,
            0,
            0,
          ],

        })

        cancelRender = () =>
          task.cancel()

        await withPdfDeadline(
          task.promise,
          `rendering page ${pageNumber}`,
          undefined,
          30000
        )

        console.log(
          '[PDF Viewer] Page rendering complete.'
        )

      } catch (error) {

        // Cancel any outstanding render task.
        cancelRender?.()

        console.error(
          '[PDF Viewer] PAGE RENDER FAILED:',
          error
        )

        if (!cancelled) {

          setViewerError(
            error instanceof Error
              ? error.message
              : 'PDF render failed.'
          )

        }

      } finally {

        if (!cancelled) {
          setIsRendering(false)
        }

      }

    }

    void renderPage()

    // --------------------------------------------------------
    // Render Cleanup
    // --------------------------------------------------------

    return () => {

      cancelled = true

      cancelRender?.()

    }

  }, [
    document,
    pageNumber,
    zoomIndex,
  ])

  // ==========================================================
  // INSPECTION CLEANUP
  // ==========================================================
  //
  // Cancel pending field inspection if the viewer unmounts.
  //
  // ==========================================================

  useEffect(() => {

    return () => {

      inspectionAbortRef.current?.abort()

    }

  }, [])

  // ==========================================================
  // FILE SELECTION
  // ==========================================================
  //
  // Opening another PDF resets:
  //
  // - The previous document's inspection results.
  // - The currently selected field.
  // - Draft dictionary mappings.
  // - The current page.
  // - Field overlay visibility.
  //
  // The original PDF remains unchanged.
  //
  // ==========================================================

  function onChooseFile(
    event: ChangeEvent<HTMLInputElement>
  ) {

    const selected =
      event.currentTarget.files?.[0]

    // Allow selecting the same PDF again.
    event.currentTarget.value = ''

    if (!selected) {
      return
    }

    console.log(
      '[PDF Viewer] File selected:',
      selected.name
    )

    // Cancel previous inspection.
    inspectionAbortRef.current?.abort()
    inspectionAbortRef.current = null

    // Reset inspection state.
    setIsInspecting(false)
    setInspection(null)
    setInspectionError('')
    setInspectionMessage('')

    // Reset document-dependent display state.
    setDocument(null)
    setViewerError('')
    setPageNumber(1)

    // Reset field overlays.
    setShowFieldOverlays(true)

    // Clear selection in EditorPage.
    onSelectField(null)

    // Clear mappings belonging to the previous document.
    onClearDraftMappings()

    // Share the original File with EditorPage for the Save PDF workflow.
    // The viewer remains responsible for opening and rendering the file.
    onSourceFileChange(selected)

    // Start loading the newly selected PDF.
    setFile(selected)

  }

  // ==========================================================
  // ANALYZE INTERACTIVE PDF FIELDS
  // ==========================================================
  //
  // This function calls inspectPdf.ts.
  //
  // It extracts:
  //
  // - PDF page information
  // - Interactive widget names
  // - Widget types
  // - Widget positions
  // - Widget dimensions
  //
  // Inspection remains separate from page rendering.
  //
  // ==========================================================

  async function analyzeFields() {

    if (
      !file ||
      !document ||
      isInspecting
    ) {
      return
    }

    const controller =
      new AbortController()

    inspectionAbortRef.current =
      controller

    setIsInspecting(true)
    setInspection(null)
    setInspectionError('')

    // Clear previous field selection.
    onSelectField(null)

    // Previous widget mappings may no longer be valid
    // after reanalysis.
    onClearDraftMappings()

    setInspectionMessage(
      'Starting field analysis...'
    )

    console.log(
      '[PDF Viewer] Starting interactive field analysis.'
    )

    try {

      const result = await inspectPdf(file, {

        signal: controller.signal,

        operationTimeoutMs: 20000,

        onProgress: (progress) => {

          if (!controller.signal.aborted) {

            console.log(
              '[PDF Viewer] Inspection progress:',
              progress.message
            )

            setInspectionMessage(
              progress.message
            )

          }

        },

      })

      if (!controller.signal.aborted) {

        console.log(
          '[PDF Viewer] Field inspection complete.'
        )

        console.log(
          '[PDF Viewer] Total widgets:',
          result.totalWidgets
        )

        setInspection(result)

      }

    } catch (error) {

      console.error(
        '[PDF Viewer] FIELD INSPECTION FAILED:',
        error
      )

      if (!controller.signal.aborted) {

        setInspectionError(
          error instanceof Error
            ? error.message
            : 'Field analysis failed.'
        )

      }

    } finally {

      if (
        inspectionAbortRef.current ===
        controller
      ) {

        inspectionAbortRef.current = null

        setIsInspecting(false)

      }

    }

  }

  // ==========================================================
  // CURRENT PAGE INFORMATION
  // ==========================================================

  const currentPage =
    inspection?.pages.find(
      (page) =>
        page.pageNumber === pageNumber
    ) ?? null

  // ==========================================================
  // SELECTED FIELD INFORMATION
  // ==========================================================
  //
  // EditorPage owns the selected field.
  //
  // The viewer only highlights it when it belongs to
  // the currently displayed page.
  //
  // ==========================================================

  const selectedPageField =
    selectedField?.pageNumber === pageNumber
      ? selectedField
      : null

  // ==========================================================
  // COMPONENT RENDER
  // ==========================================================

  return (

    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      {/* =====================================================
          VIEWER HEADER
          ===================================================== */}

      <div className="flex flex-wrap items-center justify-between gap-3">

        <div>

          <h2 className="text-lg font-semibold text-slate-800">
            PDF Viewer
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Open documents, inspect interactive fields,
            and review their positions.
          </p>

        </div>

        <div>

          <button
            type="button"
            onClick={() =>
              inputRef.current?.click()
            }
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Open PDF
          </button>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={onChooseFile}
          />

        </div>

      </div>

      {/* =====================================================
          SELECTED DOCUMENT
          ===================================================== */}

      {file && (

        <p className="break-all text-xs text-slate-600">
          File: {file.name}
        </p>

      )}

      {/* =====================================================
          PAGE NAVIGATION AND ZOOM
          ===================================================== */}

      {document && (

        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3">

          {/* Previous Page */}

          <button
            type="button"
            disabled={
              pageNumber <= 1 ||
              isRendering
            }
            onClick={() =>
              setPageNumber(
                (value) => value - 1
              )
            }
            className="rounded border border-slate-300 px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Previous
          </button>

          {/* Page Number */}

          <span className="text-sm text-slate-700">
            Page {pageNumber} of {document.numPages}
          </span>

          {/* Next Page */}

          <button
            type="button"
            disabled={
              pageNumber >= document.numPages ||
              isRendering
            }
            onClick={() =>
              setPageNumber(
                (value) => value + 1
              )
            }
            className="rounded border border-slate-300 px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Next
          </button>

          {/* Zoom */}

          <label className="ml-auto flex items-center gap-2 text-xs text-slate-600">

            Zoom

            <select
              value={zoomIndex}
              disabled={isRendering}
              onChange={(event) =>
                setZoomIndex(
                  Number(event.target.value)
                )
              }
              className="rounded border border-slate-300 bg-white px-2 py-1.5"
            >

              {ZOOM_LEVELS.map(
                (zoom, index) => (

                  <option
                    key={zoom}
                    value={index}
                  >
                    {Math.round(zoom * 100)}%
                  </option>

                )
              )}

            </select>

          </label>

        </div>

      )}

      {/* =====================================================
          DOCUMENT LOADING INDICATOR
          ===================================================== */}

      {isOpening && (

        <p
          role="status"
          className="text-sm text-blue-700"
        >
          Opening PDF...
        </p>

      )}

      {/* =====================================================
          VIEWER ERROR
          ===================================================== */}

      {viewerError && (

        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          PDF viewer: {viewerError}
        </p>

      )}

      {/* =====================================================
          PDF CANVAS AND INTERACTIVE FIELD OVERLAYS
          =====================================================
          
          The canvas and overlay share a positioning container.

          Field rectangles are positioned relative to the
          rendered PDF canvas.

          This preserves alignment when zooming.

          ===================================================== */}

      <div className="max-h-[700px] min-h-[160px] overflow-auto rounded-lg border border-slate-200 bg-slate-100 p-4 text-center">

        {/* No Document Selected */}

        {!file && (

          <p className="py-10 text-sm text-slate-500">
            Choose a PDF to display its pages.
          </p>

        )}

        {/* ===================================================
            PDF PAGE POSITIONING CONTAINER
            =================================================== */}

        <div className="relative mx-auto w-fit">

          {/* =================================================
              PDF CANVAS
              ================================================= */}

          <canvas
            ref={canvasRef}
            className={
              document
                ? 'block bg-white shadow-md'
                : 'hidden'
            }
          />

          {/* =================================================
              INTERACTIVE FIELD OVERLAYS
              =================================================

              Display overlays only when:

              - The PDF is open.
              - Field inspection has completed.
              - Overlays are enabled.
              - The current page has inspection data.
              - The page is not actively rendering.

              ================================================= */}

          {document &&
            inspection &&
            currentPage &&
            showFieldOverlays &&
            !isRendering && (

              <PdfFieldOverlay

                fields={currentPage.fields}

                scale={ZOOM_LEVELS[zoomIndex]}

                selectedFieldId={
                  selectedPageField?.id ?? null
                }

                onSelect={(field) => {

                  // Send selection to EditorPage.
                  onSelectField(field)

                }}

              />

            )}

        </div>

        {/* Page Rendering Indicator */}

        {isRendering && (

          <p
            role="status"
            className="mt-3 text-xs text-slate-500"
          >
            Rendering page...
          </p>

        )}

      </div>

      {/* =====================================================
          FIELD OVERLAY CONTROLS
          ===================================================== */}

      {document && inspection && (

        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">

          <div className="flex flex-wrap items-center justify-between gap-3">

            <div>

              <h3 className="text-sm font-semibold text-slate-800">
                Interactive Field Overlays
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {currentPage?.fields.length ?? 0}
                {' '}
                fields detected on this page.
              </p>

            </div>

            {/* Show / Hide Field Overlays */}

            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">

              <input
                type="checkbox"
                checked={showFieldOverlays}
                onChange={(event) =>
                  setShowFieldOverlays(
                    event.target.checked
                  )
                }
                className="h-4 w-4 accent-blue-600"
              />

              Show Field Outlines

            </label>

          </div>

          {/* =================================================
              FIELD OUTLINE LEGEND
              ================================================= */}

          <div className="flex flex-wrap items-center gap-5 border-t border-slate-200 pt-3">

            <div className="flex items-center gap-2">

              <span className="h-3 w-3 rounded-sm border-2 border-blue-500 bg-blue-400/20" />

              <span className="text-xs text-slate-600">
                Detected Field
              </span>

            </div>

            <div className="flex items-center gap-2">

              <span className="h-3 w-3 rounded-sm border-2 border-amber-500 bg-amber-300/30" />

              <span className="text-xs text-slate-600">
                Selected Field
              </span>

            </div>

          </div>

        </div>

      )}

      {/* =====================================================
          INTERACTIVE FIELD INSPECTION
          =====================================================
          
          This section remains a temporary diagnostic tool.

          Once automatic processing is implemented, PDF
          inspection will happen as part of that workflow.

          ===================================================== */}

      {document && (

        <div className="space-y-2 border-t border-slate-200 pt-4">

          {/* =================================================
              INSPECTION ACTIONS
              ================================================= */}

          <div className="flex flex-wrap items-center gap-3">

            <button
              type="button"
              disabled={isInspecting}
              onClick={() => {
                void analyzeFields()
              }}
              className="rounded-lg border border-blue-300 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40"
            >
              {isInspecting
                ? 'Analyzing...'
                : 'Analyze Interactive Fields'}
            </button>

            {/* Cancel Analysis */}

            {isInspecting && (

              <button
                type="button"
                onClick={() => {

                  inspectionAbortRef.current?.abort()

                  setInspectionMessage(
                    'Analysis cancelled.'
                  )

                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs"
              >
                Cancel Analysis
              </button>

            )}

          </div>

          {/* Inspection Progress */}

          {inspectionMessage && (

            <p
              role="status"
              className="text-xs text-slate-600"
            >
              {inspectionMessage}
            </p>

          )}

          {/* Inspection Error */}

          {inspectionError && (

            <p
              role="alert"
              className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800"
            >
              {inspectionError}
            </p>

          )}

          {/* =================================================
              INSPECTION RESULTS
              ================================================= */}

          {inspection && (

            <div className="space-y-2 text-xs text-slate-700">

              <p>

                {inspection.pageCount} pages
                {' · '}
                {inspection.totalWidgets} widgets
                {' · '}
                {inspection.uniqueFieldNames} distinct field names

              </p>

              <p>
                Page {pageNumber}:
                {' '}
                {currentPage?.fields.length ?? 0} widgets
              </p>

              {/* Diagnostic Field List */}

              <div className="max-h-40 overflow-auto rounded-lg bg-slate-50 p-3 font-mono">

                {currentPage?.fields.length ? (

                  currentPage.fields.map((field) => (

                    <div
                      key={`${field.pageNumber}-${field.id}-${field.widgetIndex}`}
                      className="break-all py-0.5"
                    >

                      {field.originalName || '(unnamed)'}
                      {' · '}
                      {field.fieldType}
                      {' · '}
                      widget {field.widgetIndex}

                    </div>

                  ))

                ) : (

                  'No interactive widgets on this page.'

                )}

              </div>

            </div>

          )}

        </div>

      )}

    </section>

  )

}

export default PdfPageViewer