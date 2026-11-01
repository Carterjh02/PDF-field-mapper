// ============================================================
// PDF FIELD MAPPER
// PDF PAGE VIEWER
// ============================================================
//
// PURPOSE:
//
// - Open PDF documents from the user's computer.
// - Render PDF pages using PDF.js.
// - Navigate between pages.
// - Zoom in and out.
// - Analyze existing interactive PDF fields.
// - Display field inspection results.
//
// DEBUGGING:
//
// Detailed console logs have been added to help identify
// problems when PDF.js fails to load a document.
//
// The loading process is divided into four stages:
//
// STEP 1: Read the local PDF file.
// STEP 2: Initialize the PDF.js loading task.
// STEP 3: Wait for PDF.js to open the document.
// STEP 4: Update the viewer with the loaded document.
//
// IMPORTANT:
//
// This component does not modify the original PDF.
// No PDF documents are uploaded to Supabase.
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
  type PdfInspectionResult,
} from '../../lib/pdf/inspectPdf'

// ============================================================
// PDF.JS CONFIGURATION
// ============================================================

// Configure the PDF.js worker before opening documents.
configurePdfJsWorker()

// Available PDF zoom levels.
const ZOOM_LEVELS = [
  0.75,
  1,
  1.25,
  1.5,
  2,
]

// ============================================================
// MAIN COMPONENT
// ============================================================

export function PdfPageViewer() {

  // ----------------------------------------------------------
  // References
  // ----------------------------------------------------------

  const inputRef =
    useRef<HTMLInputElement>(null)

  const canvasRef =
    useRef<HTMLCanvasElement>(null)

  const inspectionAbortRef =
    useRef<AbortController | null>(null)

  // ----------------------------------------------------------
  // Document State
  // ----------------------------------------------------------

  const [file, setFile] =
    useState<File | null>(null)

  const [document, setDocument] =
    useState<PDFDocumentProxy | null>(null)

  const [pageNumber, setPageNumber] =
    useState(1)

  const [zoomIndex, setZoomIndex] =
    useState(1)

  // ----------------------------------------------------------
  // Loading State
  // ----------------------------------------------------------

  const [isOpening, setIsOpening] =
    useState(false)

  const [isRendering, setIsRendering] =
    useState(false)

  const [viewerError, setViewerError] =
    useState('')

  // ----------------------------------------------------------
  // Inspection State
  // ----------------------------------------------------------

  const [inspection, setInspection] =
    useState<PdfInspectionResult | null>(null)

  const [inspectionMessage, setInspectionMessage] =
    useState('')

  const [inspectionError, setInspectionError] =
    useState('')

  const [isInspecting, setIsInspecting] =
    useState(false)

  // ==========================================================
  // OPEN PDF DOCUMENT
  // ==========================================================
  //
  // This effect runs whenever the selected file changes.
  //
  // PDF loading is independent of field extraction.
  //
  // Diagnostic logs identify which operation is failing.
  //
  // ==========================================================

  useEffect(() => {

    // Do nothing when no PDF is selected.
    if (!file) {
      return
    }

    // Preserve the selected file for this effect.
    const selectedFile = file

    let cancelled = false

    let loadingTask:
      ReturnType<typeof getDocument> | null = null

    const controller = new AbortController()

    // --------------------------------------------------------
    // Open File
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

      // ------------------------------------------------------
      // Reset Viewer State
      // ------------------------------------------------------

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

        const fileReadStart = performance.now()

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

          console.warn(
            '[PDF Viewer] Operation cancelled after file read.'
          )

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

        /**
         * PDF.js may report loading progress while
         * the document is being opened.
         *
         * These logs help determine whether PDF.js
         * is actively processing the document or
         * waiting for another operation.
         */
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
        // STEP 3: WAIT FOR PDF DOCUMENT
        // ====================================================

        console.log(
          '[PDF Viewer] STEP 3: Waiting for PDF.js to open document...'
        )

        const pdfOpenStart = performance.now()

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
        // ERROR DIAGNOSTICS
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

        // ====================================================
        // COMPLETION LOGGING
        // ====================================================

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

    // --------------------------------------------------------
    // Start PDF Loading
    // --------------------------------------------------------

    void openFile()

    // --------------------------------------------------------
    // Cleanup
    // --------------------------------------------------------

    /**
     * Runs when:
     *
     * - Another PDF is selected.
     * - The component unmounts.
     *
     * Cancel pending operations and initiate cleanup.
     *
     * Cleanup is intentionally nonblocking.
     */
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
  // - A PDF document finishes loading.
  // - The selected page changes.
  // - The zoom level changes.
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

    let cancelled = false

    let cancelRender: (() => void) | null = null

    async function renderPage() {

      console.log(
        '[PDF Viewer] Starting page render:',
        pageNumber
      )

      setIsRendering(true)
      setViewerError('')

      try {

        // ----------------------------------------------------
        // Load Page
        // ----------------------------------------------------

        console.log(
          '[PDF Viewer] Retrieving page:',
          pageNumber
        )

        const page = await withPdfDeadline(
          document!.getPage(pageNumber),
          `opening page ${pageNumber}`
        )

        if (cancelled) {
          return
        }

        console.log(
          '[PDF Viewer] Page retrieved successfully.'
        )

        // ----------------------------------------------------
        // Calculate Viewport
        // ----------------------------------------------------

        const viewport = page.getViewport({
          scale: ZOOM_LEVELS[zoomIndex],
        })

        const ratio = Math.min(
          window.devicePixelRatio || 1,
          2
        )

        // ----------------------------------------------------
        // Configure Canvas
        // ----------------------------------------------------

        canvas!.width = Math.ceil(
          viewport.width * ratio
        )

        canvas!.height = Math.ceil(
          viewport.height * ratio
        )

        canvas!.style.width =
          `${viewport.width}px`

        canvas!.style.height =
          `${viewport.height}px`

        const context = canvas!.getContext('2d')

        if (!context) {
          throw new Error(
            'Unable to create the PDF canvas.'
          )
        }

        // ----------------------------------------------------
        // Render Page
        // ----------------------------------------------------

        console.log(
          '[PDF Viewer] Rendering page to canvas...'
        )

        // ----------------------------------------------------
        // Render PDF Page
        // ----------------------------------------------------
        //
        // PDF.js 4 uses canvasContext to identify the canvas
        // rendering context.
        //
        // The explicit "canvas" property was introduced in
        // newer PDF.js versions and is not supported here.
        //
        // ----------------------------------------------------
        
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

        cancelRender = () => task.cancel()

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

        // Cancel a render that may still be running.
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

  useEffect(() => {

    return () => {
      inspectionAbortRef.current?.abort()
    }

  }, [])

  // ==========================================================
  // FILE SELECTION
  // ==========================================================

  function onChooseFile(
    event: ChangeEvent<HTMLInputElement>
  ) {

    const selected =
      event.currentTarget.files?.[0]

    // Allow the same PDF to be selected again.
    event.currentTarget.value = ''

    if (!selected) {
      return
    }

    console.log(
      '[PDF Viewer] File selected:',
      selected.name
    )

    // Cancel any previous field inspection.
    inspectionAbortRef.current?.abort()

    setIsInspecting(false)
    setInspection(null)
    setInspectionError('')
    setInspectionMessage('')

    setPageNumber(1)

    setFile(selected)

  }

  // ==========================================================
  // ANALYZE INTERACTIVE FIELDS
  // ==========================================================
  //
  // This remains separate from page rendering.
  //
  // The user can inspect fields after the PDF opens.
  //
  // ==========================================================

  async function analyzeFields() {

    if (!file || !document || isInspecting) {
      return
    }

    const controller = new AbortController()

    inspectionAbortRef.current = controller

    setIsInspecting(true)
    setInspection(null)
    setInspectionError('')

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

      if (inspectionAbortRef.current === controller) {

        inspectionAbortRef.current = null

        setIsInspecting(false)

      }

    }

  }

  // ==========================================================
  // CURRENT INSPECTED PAGE
  // ==========================================================

  const currentPage = inspection?.pages.find(
    (page) =>
      page.pageNumber === pageNumber
  )

  // ==========================================================
  // RENDER COMPONENT
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

          <p className="text-xs text-slate-500">
            Local PDF rendering and field-extraction
            diagnostics. The original file is unchanged.
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
          SELECTED FILE
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

          <span className="text-sm text-slate-700">
            Page {pageNumber} of {document.numPages}
          </span>

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
          LOADING INDICATOR
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
          ERROR DISPLAY
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
          PDF CANVAS
          ===================================================== */}

      <div className="max-h-[700px] min-h-[160px] overflow-auto rounded-lg border border-slate-200 bg-slate-100 p-4 text-center">

        {!file && (

          <p className="py-10 text-sm text-slate-500">
            Choose a PDF to display its pages.
          </p>

        )}

        <canvas
          ref={canvasRef}
          className={
            document
              ? 'mx-auto bg-white shadow-md'
              : 'hidden'
          }
        />

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
          INTERACTIVE FIELD ANALYSIS
          ===================================================== */}

      {document && (

        <div className="space-y-2 border-t border-slate-200 pt-4">

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

          {/* Inspection Results */}

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

              <div className="max-h-40 overflow-auto rounded-lg bg-slate-50 p-3 font-mono">

                {currentPage?.fields.length ? (

                  currentPage.fields.map((field) => (

                    <div
                      key={`${field.id}-${field.widgetIndex}`}
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