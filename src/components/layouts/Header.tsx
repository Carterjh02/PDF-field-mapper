import type { ReactNode } from 'react'
import clsx from 'clsx'

/* =========================================================
   PDF FIELD MAPPER
   Application Header
   ========================================================= */

/**
 * Properties for the shared application header.
 */
export interface HeaderProps {

  /**
   * Main page title.
   *
   * Example: "Dictionary"
   */
  title: string

  /**
   * Optional supporting description.
   *
   * Example:
   * "Manage recognized field names and learned aliases."
   */
  description?: string

  /**
   * Optional actions displayed on the right.
   *
   * This can contain reusable Button components,
   * search controls, or other page-specific elements.
   */
  actions?: ReactNode

  /**
   * Additional classes applied to the header.
   */
  className?: string
}

/* =========================================================
   Header Component
   ========================================================= */

/**
 * Shared application header.
 *
 * Responsibilities:
 *
 * - Display the current page title
 * - Display an optional page description
 * - Provide space for optional page actions
 *
 * The header does not determine the active route.
 *
 * AppLayout will supply the appropriate title and
 * description based on the current application page.
 *
 * Example:
 *
 * <Header
 *   title="Dictionary"
 *   description="Manage recognized PDF fields."
 * />
 *
 * Example with actions:
 *
 * <Header
 *   title="Dictionary"
 *   description="Manage recognized PDF fields."
 *   actions={
 *     <Button>
 *       Add Mapping
 *     </Button>
 *   }
 * />
 */
export function Header({
  title,
  description,
  actions,
  className,
}: HeaderProps) {

  return (
    <header
      className={clsx(
        'flex',
        'min-h-20',
        'w-full',
        'shrink-0',
        'items-center',
        'justify-between',
        'gap-6',

        'border-b',
        'border-[var(--color-border)]',

        'bg-[var(--color-surface)]',

        'px-8',
        'py-4',

        className
      )}
    >

      {/* ===================================================
          Page Information
          =================================================== */}

      <div
        className={clsx(
          'flex',
          'min-w-0',
          'flex-1',
          'flex-col',
          'justify-center',
          'gap-1'
        )}
      >

        {/* Current page title */}
        <h1
          className={clsx(
            'm-0',
            'truncate',
            'text-xl',
            'font-bold',
            'tracking-tight',
            'text-[var(--color-text-primary)]'
          )}
        >
          {title}
        </h1>

        {/* Optional page description */}
        {description && (
          <p
            className={clsx(
              'm-0',
              'truncate',
              'text-sm',
              'text-[var(--color-text-secondary)]'
            )}
          >
            {description}
          </p>
        )}

      </div>

      {/* ===================================================
          Optional Page Actions
          =================================================== */}

      {actions && (
        <div
          className={clsx(
            'flex',
            'shrink-0',
            'items-center',
            'justify-end',
            'gap-3'
          )}
        >
          {actions}
        </div>
      )}

    </header>
  )
}

export default Header