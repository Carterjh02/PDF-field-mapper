// ============================================================
// PDF Field Mapper - Local PDF inspection service
// ============================================================
// Reads interactive AcroForm widgets without modifying or
// uploading the source document. Used by the future processing
// pipeline and by the editor's temporary diagnostic controls.

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?worker&url'

// ============================================================
// PDF.JS WORKER CONFIGURATION
// ============================================================
//
// Vite resolves the PDF.js worker as a separate asset.
//
// Using ?worker&url allows Vite to process the worker
// correctly during development and production builds.
//
// PDF.js uses this URL to initialize its processing worker.
//
// This configuration is shared by:
// - PDF inspection
// - PDF rendering
// - Future PDF processing functionality
//
// ============================================================

export function configurePdfJsWorker(): void {
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl
}

configurePdfJsWorker()

export type PdfFieldType =
  | 'text'
  | 'checkbox'
  | 'radio'
  | 'button'
  | 'choice'
  | 'signature'
  | 'unknown'

export interface InspectedPdfField {
  id: string
  originalName: string
  fieldType: PdfFieldType
  rawFieldType: string | null
  pageNumber: number
  widgetIndex: number
  // PDF.js viewport coordinates at scale 1 (top-left origin).
  x: number
  y: number
  width: number
  height: number
  readOnly: boolean
  required: boolean
}

export interface InspectedPdfPage {
  pageNumber: number
  width: number
  height: number
  rotation: number
  fields: InspectedPdfField[]
}

export interface PdfInspectionResult {
  fileName: string
  fileSize: number
  pageCount: number
  totalWidgets: number
  uniqueFieldNames: number
  pages: InspectedPdfPage[]
}

export interface PdfInspectionProgress {
  stage: 'reading' | 'opening' | 'page' | 'annotations' | 'complete'
  message: string
  pageNumber?: number
  pageCount?: number
}

export interface InspectPdfOptions {
  signal?: AbortSignal
  onProgress?: (progress: PdfInspectionProgress) => void
  // Maximum time allowed for any one PDF.js operation.
  operationTimeoutMs?: number
}

interface PdfWidgetAnnotation {
  id?: string
  subtype?: string
  fieldName?: string
  fieldType?: string
  rect?: number[]
  checkBox?: boolean
  radioButton?: boolean
  pushButton?: boolean
  readOnly?: boolean
  required?: boolean
}

export function makePdfAbortError(): Error {
  const error = new Error('PDF operation cancelled.')
  error.name = 'AbortError'
  return error
}

/**
 * Bound an individual asynchronous PDF.js operation.
 * This keeps the UI responsive if a PDF is malformed or a worker
 * stops responding. The caller still owns/cancels the PDF.js task.
 */
export function withPdfDeadline<T>(
  operation: Promise<T>,
  description: string,
  signal?: AbortSignal,
  timeoutMs = 20000
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(makePdfAbortError())
      return
    }

    let finished = false
    const onAbort = () => finish(() => reject(makePdfAbortError()))
    const timer = setTimeout(() => {
      finish(() => reject(new Error(
        `Timed out ${description} after ${Math.round(timeoutMs / 1000)} seconds.`
      )))
    }, timeoutMs)

    function finish(settle: () => void) {
      if (finished) return
      finished = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      settle()
    }

    signal?.addEventListener('abort', onAbort, { once: true })
    operation.then(
      (value) => finish(() => resolve(value)),
      (error: unknown) => finish(() => reject(error))
    )
  })
}

function classifyFieldType(field: PdfWidgetAnnotation): PdfFieldType {
  switch (field.fieldType) {
    case 'Tx': return 'text'
    case 'Ch': return 'choice'
    case 'Sig': return 'signature'
    case 'Btn':
      if (field.checkBox) return 'checkbox'
      if (field.radioButton) return 'radio'
      return 'button'
    default: return 'unknown'
  }
}

export async function inspectPdf(
  file: File,
  options: InspectPdfOptions = {}
): Promise<PdfInspectionResult> {
  if (!file.name.toLowerCase().endsWith('.pdf') || file.size === 0) {
    throw new Error('Select a non-empty PDF file.')
  }

  const { signal, onProgress, operationTimeoutMs = 20000 } = options
  const progress = (update: PdfInspectionProgress) => {
    console.debug('[PDF inspection]', update.message)
    onProgress?.(update)
  }

  let loadingTask: ReturnType<typeof getDocument> | null = null

  try {
    progress({ stage: 'reading', message: 'Reading local PDF file...' })
    const bytes = await withPdfDeadline(
      file.arrayBuffer(), 'reading the file', signal, operationTimeoutMs
    )

    if (signal?.aborted) throw makePdfAbortError()

    progress({ stage: 'opening', message: 'Opening PDF with PDF.js...' })
    loadingTask = getDocument({ data: new Uint8Array(bytes) })
    const pdf = await withPdfDeadline(
      loadingTask.promise, 'opening the PDF', signal, operationTimeoutMs
    )

    const pages: InspectedPdfPage[] = []
    const uniqueNames = new Set<string>()
    let totalWidgets = 0

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      if (signal?.aborted) throw makePdfAbortError()
      progress({
        stage: 'page',
        message: `Opening page ${pageNumber} of ${pdf.numPages}...`,
        pageNumber,
        pageCount: pdf.numPages,
      })

      const page = await withPdfDeadline(
        pdf.getPage(pageNumber),
        `opening page ${pageNumber}`,
        signal,
        operationTimeoutMs
      )
      const viewport = page.getViewport({ scale: 1 })

      progress({
        stage: 'annotations',
        message: `Reading fields on page ${pageNumber} of ${pdf.numPages}...`,
        pageNumber,
        pageCount: pdf.numPages,
      })

      const annotations = await withPdfDeadline(
        page.getAnnotations({ intent: 'display' }),
        `reading annotations on page ${pageNumber}`,
        signal,
        operationTimeoutMs
      )

      const fields: InspectedPdfField[] = []
      const widgetCounts = new Map<string, number>()

      for (const item of annotations) {
        const annotation = item as PdfWidgetAnnotation
        if (annotation.subtype !== 'Widget') continue

        const originalName = annotation.fieldName ?? ''
        const widgetIndex = widgetCounts.get(originalName) ?? 0
        widgetCounts.set(originalName, widgetIndex + 1)

        let x = 0
        let y = 0
        let width = 0
        let height = 0

        if (annotation.rect?.length === 4) {
          const [x1, y1, x2, y2] = viewport.convertToViewportRectangle(
            annotation.rect
          )
          x = Math.min(x1, x2)
          y = Math.min(y1, y2)
          width = Math.abs(x2 - x1)
          height = Math.abs(y2 - y1)
        }

        fields.push({
          id: annotation.id ?? `${pageNumber}-${fields.length}`,
          originalName,
          fieldType: classifyFieldType(annotation),
          rawFieldType: annotation.fieldType ?? null,
          pageNumber,
          widgetIndex,
          x,
          y,
          width,
          height,
          readOnly: annotation.readOnly ?? false,
          required: annotation.required ?? false,
        })
        totalWidgets++
        if (originalName) uniqueNames.add(originalName)
      }

      pages.push({
        pageNumber,
        width: viewport.width,
        height: viewport.height,
        rotation: viewport.rotation,
        fields,
      })
    }

    progress({ stage: 'complete', message: 'PDF field inspection complete.' })
    return {
      fileName: file.name,
      fileSize: file.size,
      pageCount: pdf.numPages,
      totalWidgets,
      uniqueFieldNames: uniqueNames.size,
      pages,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    const message = error instanceof Error ? error.message : 'Unknown PDF error'
    throw new Error(`Unable to inspect PDF: ${message}`)
  } finally {
    // Do NOT await destruction here: a stalled worker could make
    // inspection appear stuck forever during cleanup. Destroy is
    // initiated and handled without blocking the UI.
    if (loadingTask) {
      try {
        void loadingTask.destroy().catch((error: unknown) => {
          console.warn('[PDF inspection] Worker cleanup issue:', error)
        })
      } catch (error) {
        console.warn('[PDF inspection] Worker cleanup issue:', error)
      }
    }
  }
}
