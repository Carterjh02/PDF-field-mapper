// ============================================================
// PDF FIELD MAPPER
// PDF FIELD OVERLAY
// ============================================================
//
// PURPOSE:
//
// Display selectable rectangles over existing interactive
// PDF fields.
//
// Field positions come directly from the PDF inspection
// service.
//
// IMPORTANT:
//
// - This component does not modify PDF documents.
// - It does not rename or reposition fields.
// - It does not create database mappings.
// - Selection is currently for inspection only.
//
// The overlay is positioned over the rendered PDF canvas.
//
// ============================================================

import type {
  InspectedPdfField,
} from '../../lib/pdf/inspectPdf'

// ============================================================
// COMPONENT PROPERTIES
// ============================================================

interface PdfFieldOverlayProps {

  // Interactive widgets belonging to the current PDF page.
  fields: InspectedPdfField[]

  // Current PDF viewer zoom level.
  scale: number

  // ID of the currently selected field.
  selectedFieldId: string | null

  // Called when a user selects a field.
  onSelect: (field: InspectedPdfField) => void

}

// ============================================================
// COMPONENT
// ============================================================

export function PdfFieldOverlay({
  fields,
  scale,
  selectedFieldId,
  onSelect,
}: PdfFieldOverlayProps) {

  return (

    <div
      className="pointer-events-none absolute inset-0 z-10"
      aria-label="PDF interactive field overlays"
    >

      {fields.map((field) => {

        // ----------------------------------------------------
        // Calculate Field Position
        // ----------------------------------------------------

        /**
         * inspectPdf.ts stores coordinates using the PDF.js
         * viewport at scale 1.
         *
         * Multiply each coordinate by the viewer's current
         * zoom level to maintain alignment with the canvas.
         *
         * This works because both the inspection service
         * and the viewer use PDF.js viewport coordinates.
         */

        const x = field.x * scale

        const y = field.y * scale

        const width = field.width * scale

        const height = field.height * scale

        // ----------------------------------------------------
        // Selection State
        // ----------------------------------------------------

        const isSelected =
          selectedFieldId === field.id

        // ----------------------------------------------------
        // Field Description
        // ----------------------------------------------------

        const fieldName =
          field.originalName || '(unnamed)'

        const fieldDescription =
          `${fieldName} · ${field.fieldType}`

        // ----------------------------------------------------
        // Render Field Rectangle
        // ----------------------------------------------------

        return (

          <button
            key={`${field.id}-${field.widgetIndex}`}
            type="button"

            title={fieldDescription}

            aria-label={
              `Select PDF field ${fieldName}`
            }

            aria-pressed={isSelected}

            onClick={(event) => {

              // Prevent field selection from accidentally
              // triggering future editor interactions.
              event.stopPropagation()

              onSelect(field)

            }}

            style={{
              left: `${x}px`,
              top: `${y}px`,
              width: `${width}px`,
              height: `${height}px`,
            }}

            className={`
              pointer-events-auto
              absolute
              box-border
              cursor-pointer
              overflow-hidden
              rounded-[2px]
              border-2
              transition-colors
              focus-visible:outline
              focus-visible:outline-offset-2
              focus-visible:outline-blue-600

              ${
                isSelected
                  ? `
                    border-amber-500
                    bg-amber-300/30
                    ring-2
                    ring-amber-400/40
                  `
                  : `
                    border-blue-500
                    bg-blue-400/15
                    hover:border-blue-700
                    hover:bg-blue-400/30
                  `
              }
            `}
          >

            {/* ===============================================
                FIELD LABEL
                ===============================================

                Display the original field name when
                sufficient vertical space is available.

                Small fields, such as checkboxes, use
                the browser tooltip instead.

                =============================================== */}

            {field.fieldType === 'text' &&
                height >= 14 &&
                width >= 45 && (

              <span
                className={`
                  block
                  max-w-full
                  truncate
                  px-1
                  text-left
                  text-[9px]
                  font-semibold
                  leading-[12px]

                  ${
                    isSelected
                      ? 'text-amber-900'
                      : 'text-blue-800'
                  }
                `}
              >

                {fieldName}

              </span>

            )}

          </button>

        )

      })}

    </div>

  )

}

export default PdfFieldOverlay