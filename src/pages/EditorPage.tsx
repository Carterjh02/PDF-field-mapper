import type { ReactNode } from 'react'

import { useNavigate } from 'react-router-dom'

import clsx from 'clsx'

import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'

/* =========================================================
   PDF FIELD MAPPER
   PDF Editor Page
   ========================================================= */

/**
 * Main PDF Editor interface.
 *
 * CURRENT FUNCTIONALITY:
 *
 * - Displays the editor workspace.
 * - Provides document and navigation controls.
 * - Displays field category information.
 * - Displays recognition confidence information.
 * - Provides space for field inspection.
 * - Navigates to related application pages.
 *
 * FUTURE FUNCTIONALITY:
 *
 * - Load and render PDF documents.
 * - Navigate between PDF pages.
 * - Control zoom and document positioning.
 * - Display interactive field overlays.
 * - Select and modify PDF fields.
 * - Create, move, and resize fields.
 * - Assign dictionary mappings.
 * - Save modified PDF documents.
 *
 * IMPORTANT:
 *
 * This component is currently a visual foundation.
 *
 * PDF loading, field editing, and saving will be
 * connected in subsequent development phases.
 */

/* =========================================================
   Icons
   ========================================================= */

type EditorIconName =
  | 'document'
  | 'cursor'
  | 'layers'
  | 'info'
  | 'chevronLeft'
  | 'chevronRight'
  | 'zoomIn'
  | 'zoomOut'

interface EditorIconProps {
  name: EditorIconName
  className?: string
}

/**
 * Shared SVG icon renderer.
 *
 * Icons are intentionally local to this page.
 * We can extract frequently reused icons into
 * a shared component when appropriate.
 */
function EditorIcon({
  name,
  className,
}: EditorIconProps) {
  let content: ReactNode

  switch (name) {
    case 'document':
      content = (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h6" />
        </>
      )
      break

    case 'cursor':
      content = (
        <>
          <path d="m4 3 7 18 2.5-7.5L21 11 4 3z" />
        </>
      )
      break

    case 'layers':
      content = (
        <>
          <rect x="5" y="3" width="14" height="16" rx="2" />
          <path d="M9 7h6" />
          <path d="M9 11h6" />
          <path d="M3 7v12a2 2 0 0 0 2 2h10" />
        </>
      )
      break

    case 'info':
      content = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" />
          <path d="M12 8h.01" />
        </>
      )
      break

    case 'chevronLeft':
      content = <path d="m15 18-6-6 6-6" />
      break

    case 'chevronRight':
      content = <path d="m9 18 6-6-6-6" />
      break

    case 'zoomIn':
      content = (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
          <path d="M11 8v6" />
          <path d="M8 11h6" />
        </>
      )
      break

    case 'zoomOut':
      content = (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
          <path d="M8 11h6" />
        </>
      )
      break
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={clsx(
        'h-5 w-5 shrink-0',
        className
      )}
      aria-hidden="true"
    >
      {content}
    </svg>
  )
}

/* =========================================================
   Field Category Legend
   ========================================================= */

/**
 * PDF fields will use category-specific border colors.
 *
 * These values correspond to the global design tokens
 * defined in src/index.css.
 */
const fieldCategories = [
  {
    label: 'Customer',
    color: 'var(--color-field-customer)',
  },
  {
    label: 'Company',
    color: 'var(--color-field-company)',
  },
  {
    label: 'Job / Property',
    color: 'var(--color-field-job)',
  },
  {
    label: 'Generic',
    color: 'var(--color-field-generic)',
  },
]

/**
 * Displays the legend for field category colors.
 */
function FieldCategoryLegend() {
  return (
    <div className="space-y-3">
      {fieldCategories.map((category) => (
        <div
          key={category.label}
          className="flex items-center gap-3"
        >
          <span
            className="h-3 w-3 shrink-0 rounded-sm border-2"
            style={{
              borderColor: category.color,
            }}
            aria-hidden="true"
          />

          <span className="text-xs text-slate-600">
            {category.label}
          </span>
        </div>
      ))}
    </div>
  )
}

/* =========================================================
   Recognition Confidence Legend
   ========================================================= */

/**
 * Recognition confidence uses background highlights,
 * separate from the field category border colors.
 */
const confidenceLevels = [
  {
    label: 'High Confidence',
    background: 'var(--color-confidence-high)',
  },
  {
    label: 'Needs Review',
    background: 'var(--color-confidence-medium)',
  },
  {
    label: 'Unmapped / Low Confidence',
    background: 'var(--color-confidence-low)',
  },
]

function ConfidenceLegend() {
  return (
    <div className="space-y-3">
      {confidenceLevels.map((level) => (
        <div
          key={level.label}
          className="flex items-center gap-3"
        >
          <span
            className="h-3 w-3 shrink-0 rounded-sm border border-slate-200"
            style={{
              backgroundColor: level.background,
            }}
            aria-hidden="true"
          />

          <span className="text-xs text-slate-600">
            {level.label}
          </span>
        </div>
      ))}
    </div>
  )
}

/* =========================================================
   Document Toolbar
   ========================================================= */

/**
 * Controls that will eventually manage the active PDF.
 *
 * The controls are disabled until a real document
 * can be loaded into the editor.
 */
function DocumentToolbar() {
  return (
    <div
      className={clsx(
        'flex',
        'flex-wrap',
        'items-center',
        'justify-between',
        'gap-3',
        'border-b',
        'border-slate-200',
        'bg-white',
        'px-4',
        'py-3'
      )}
    >
      {/* Page Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled
          aria-label="Previous page"
          title="Load a PDF to navigate pages."
        >
          <EditorIcon
            name="chevronLeft"
            className="h-4 w-4"
          />
        </Button>

        <span className="min-w-24 text-center text-xs font-medium text-slate-500">
          Page — / —
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled
          aria-label="Next page"
          title="Load a PDF to navigate pages."
        >
          <EditorIcon
            name="chevronRight"
            className="h-4 w-4"
          />
        </Button>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled
          aria-label="Zoom out"
          title="Zoom will be available after PDF rendering is implemented."
        >
          <EditorIcon
            name="zoomOut"
            className="h-4 w-4"
          />
        </Button>

        <span className="min-w-14 text-center text-xs font-medium text-slate-500">
          100%
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled
          aria-label="Zoom in"
          title="Zoom will be available after PDF rendering is implemented."
        >
          <EditorIcon
            name="zoomIn"
            className="h-4 w-4"
          />
        </Button>
      </div>

      {/* Document Status */}
      <Badge variant="neutral" size="sm">
        No Document Loaded
      </Badge>
    </div>
  )
}

/* =========================================================
   PDF Viewer Workspace
   ========================================================= */

/**
 * Main viewing area.
 *
 * PDF.js will eventually render document pages here.
 *
 * Field overlays will be positioned relative to the
 * rendered PDF page, not the application window.
 *
 * This is important for accurate field placement
 * when zooming, scrolling, or resizing.
 */
function PDFViewerWorkspace() {
  return (
    <div
      className={clsx(
        'flex',
        'min-h-0',
        'flex-1',
        'items-center',
        'justify-center',
        'overflow-auto',
        'bg-slate-100',
        'p-6'
      )}
    >
      {/* Empty Document State */}
      <div
        className={clsx(
          'flex',
          'w-full',
          'max-w-md',
          'flex-col',
          'items-center',
          'justify-center',
          'rounded-2xl',
          'border',
          'border-dashed',
          'border-slate-300',
          'bg-white',
          'px-8',
          'py-12',
          'text-center',
          'shadow-sm'
        )}
      >
        <div
          className={clsx(
            'flex',
            'h-20',
            'w-20',
            'items-center',
            'justify-center',
            'rounded-2xl',
            'bg-blue-50',
            'text-blue-600'
          )}
        >
          <EditorIcon
            name="document"
            className="h-10 w-10"
          />
        </div>

        <h2 className="mt-6 text-lg font-semibold text-slate-800">
          No PDF Document Loaded
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          Open a PDF document to begin reviewing its
          interactive fields, dictionary mappings,
          and recognition results.
        </p>

        <p className="mt-5 text-xs leading-relaxed text-slate-400">
          Document viewing and field editing will become
          available when PDF loading is connected.
        </p>
      </div>
    </div>
  )
}

/* =========================================================
   Field Inspector
   ========================================================= */

/**
 * The field inspector will eventually display properties
 * for whichever interactive PDF field is selected.
 *
 * It will include:
 *
 * - Original PDF field name
 * - Selected dictionary key
 * - Recognition method and confidence
 * - Field type
 * - Field position and dimensions
 * - Editing and mapping controls
 */
function FieldInspector() {
  return (
    <Card
      padding="none"
      className="overflow-hidden"
    >
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Field Inspector
          </h2>

          <Badge variant="neutral" size="sm">
            No Selection
          </Badge>
        </div>

        <p className="mt-1 text-xs text-slate-500">
          Review and edit individual PDF fields.
        </p>
      </div>

      <div className="flex flex-col items-center px-5 py-9 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
          <EditorIcon
            name="cursor"
            className="h-6 w-6"
          />
        </div>

        <h3 className="mt-4 text-sm font-semibold text-slate-700">
          No Field Selected
        </h3>

        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Select a field in the PDF viewer to inspect
          its properties and dictionary mapping.
        </p>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
        <p className="text-xs text-slate-500">
          Field editing tools will become available
          after PDF inspection is implemented.
        </p>
      </div>
    </Card>
  )
}

/* =========================================================
   Document Fields Panel
   ========================================================= */

/**
 * Eventually displays all form fields detected within
 * the current document.
 *
 * Selecting a field from this list will highlight
 * the corresponding field in the PDF viewer.
 */
function DocumentFieldsPanel() {
  return (
    <Card
      padding="none"
      className="overflow-hidden"
    >
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Document Fields
          </h2>

          <Badge variant="neutral" size="sm">
            0 Fields
          </Badge>
        </div>

        <p className="mt-1 text-xs text-slate-500">
          Interactive fields in the current PDF.
        </p>
      </div>

      <div className="flex flex-col items-center px-5 py-8 text-center">
        <EditorIcon
          name="layers"
          className="h-8 w-8 text-slate-300"
        />

        <p className="mt-3 text-xs font-medium text-slate-600">
          No document fields available
        </p>

        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          Detected fields will appear here when
          a PDF is loaded and inspected.
        </p>
      </div>
    </Card>
  )
}

/* =========================================================
   Editor Reference Panel
   ========================================================= */

/**
 * Displays category and recognition legends.
 *
 * Both conventions will remain consistent with the
 * Dictionary and future field-overlay components.
 */
function EditorReferencePanel() {
  return (
    <Card>
      <h2 className="text-sm font-semibold text-slate-800">
        Field Display Reference
      </h2>

      <p className="mt-1 text-xs text-slate-500">
        How PDF fields will be categorized and highlighted.
      </p>

      <div className="mt-5">
        <h3 className="mb-3 text-xs font-semibold text-slate-700">
          Field Categories
        </h3>

        <FieldCategoryLegend />
      </div>

      <div className="my-5 border-t border-slate-200" />

      <div>
        <h3 className="mb-3 text-xs font-semibold text-slate-700">
          Recognition Confidence
        </h3>

        <ConfidenceLegend />
      </div>
    </Card>
  )
}

/* =========================================================
   Main Editor Page
   ========================================================= */

/**
 * Main PDF Editor page.
 *
 * The shared Sidebar and Header are provided by
 * AppLayout.tsx.
 *
 * The editor contains its own document toolbar,
 * viewing workspace, and field inspection panels.
 */
export function EditorPage() {
  const navigate = useNavigate()

  return (
    <div
      className={clsx(
        'flex',
        'h-full',
        'min-h-[680px]',
        'w-full',
        'flex-col',
        'gap-4',
        'p-5',
        'lg:p-6'
      )}
    >
      {/* ===================================================
          Editor Header
          =================================================== */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-800">
            PDF Document Editor
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Review document fields and prepare their mappings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dictionary')}
          >
            View Dictionary
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/upload')}
          >
            Go to Upload & Process
          </Button>

          <Button
            variant="secondary"
            size="sm"
            disabled
            title="Saving will be enabled when PDF editing is implemented."
          >
            Save PDF
          </Button>
        </div>
      </div>

      {/* ===================================================
          Editor Workspace
          =================================================== */}

      <div
        className={clsx(
          'grid',
          'min-h-0',
          'flex-1',
          'grid-cols-1',
          'items-stretch',
          'gap-4',
          'lg:grid-cols-[minmax(0,1fr)_310px]'
        )}
      >
        {/* ===============================================
            PDF Viewer Column
            =============================================== */}

        <section
          aria-label="PDF document viewer"
          className={clsx(
            'flex',
            'min-h-[500px]',
            'min-w-0',
            'flex-col',
            'overflow-hidden',
            'rounded-xl',
            'border',
            'border-slate-200',
            'bg-white',
            'shadow-sm'
          )}
        >
          <DocumentToolbar />

          <PDFViewerWorkspace />

          {/* Viewer Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
            <span className="text-xs text-slate-500">
              No PDF selected
            </span>

            <Badge variant="neutral" size="sm">
              Editor Ready
            </Badge>
          </div>
        </section>

        {/* ===============================================
            Inspector Column
            =============================================== */}

        <aside
          aria-label="PDF field editing panels"
          className={clsx(
            'flex',
            'min-h-0',
            'min-w-0',
            'flex-col',
            'gap-4',
            'overflow-y-auto',
            'pr-1'
          )}
        >
          <FieldInspector />

          <DocumentFieldsPanel />

          <EditorReferencePanel />
        </aside>
      </div>

      {/* ===================================================
          Development Notice
          =================================================== */}

      <div
        className={clsx(
          'flex',
          'items-start',
          'gap-3',
          'rounded-lg',
          'border',
          'border-blue-100',
          'bg-blue-50',
          'p-3'
        )}
      >
        <EditorIcon
          name="info"
          className="h-4 w-4 text-blue-600"
        />

        <p className="text-xs leading-relaxed text-blue-800">
          The PDF Editor interface is ready for integration.
          PDF rendering, interactive field overlays, and
          document saving will be implemented in the
          next development phases.
        </p>
      </div>
    </div>
  )
}

export default EditorPage