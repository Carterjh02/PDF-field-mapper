import {
    forwardRef,
    type HTMLAttributes,
  } from 'react'
  
  import clsx from 'clsx'
  
  /* =========================================================
     PDF FIELD MAPPER
     Reusable Badge Component
     ========================================================= */
  
  /**
   * Available badge appearance variants.
   *
   * General status variants:
   * - neutral
   * - info
   * - success
   * - warning
   * - danger
   *
   * PDF field category variants:
   * - customer
   * - company
   * - job
   * - generic
   */
  export type BadgeVariant =
    | 'neutral'
    | 'info'
    | 'success'
    | 'warning'
    | 'danger'
    | 'customer'
    | 'company'
    | 'job'
    | 'generic'
  
  /**
   * Available badge sizes.
   */
  export type BadgeSize = 'sm' | 'md'
  
  /**
   * Badge component properties.
   *
   * Standard HTML span attributes are supported.
   */
  export interface BadgeProps
    extends HTMLAttributes<HTMLSpanElement> {
  
    /**
     * Badge appearance.
     *
     * Default: neutral
     */
    variant?: BadgeVariant
  
    /**
     * Badge size.
     *
     * Default: md
     */
    size?: BadgeSize
  
    /**
     * Displays a small colored status dot.
     *
     * Default: false
     */
    showDot?: boolean
  }
  
  /* =========================================================
     Badge Styles
     ========================================================= */
  
  /**
   * Shared badge styling.
   *
   * Badges are informational and do not behave as buttons.
   */
  const baseStyles = clsx(
    'inline-flex',
    'w-fit',
    'max-w-full',
    'items-center',
    'justify-center',
    'gap-1.5',
    'rounded-full',
    'border',
    'font-medium',
    'leading-none',
    'align-middle'
  )
  
  /**
   * Badge appearance variants.
   *
   * Category-specific colors correspond to the global
   * PDF field category colors established in index.css.
   */
  const variantStyles: Record<BadgeVariant, string> = {
  
    neutral: clsx(
      'bg-slate-100',
      'text-slate-700',
      'border-slate-200'
    ),
  
    info: clsx(
      'bg-blue-50',
      'text-blue-700',
      'border-blue-200'
    ),
  
    success: clsx(
      'bg-green-50',
      'text-green-800',
      'border-green-200'
    ),
  
    warning: clsx(
      'bg-amber-50',
      'text-amber-800',
      'border-amber-200'
    ),
  
    danger: clsx(
      'bg-red-50',
      'text-red-700',
      'border-red-200'
    ),
  
    customer: clsx(
      'bg-blue-50',
      'text-blue-700',
      'border-blue-200'
    ),
  
    company: clsx(
      'bg-purple-50',
      'text-purple-700',
      'border-purple-200'
    ),
  
    job: clsx(
      'bg-green-50',
      'text-green-800',
      'border-green-200'
    ),
  
    generic: clsx(
      'bg-orange-50',
      'text-orange-800',
      'border-orange-200'
    ),
  }
  
  /**
   * Badge sizes.
   */
  const sizeStyles: Record<BadgeSize, string> = {
  
    sm: clsx(
      'min-h-5',
      'px-2',
      'py-1',
      'text-[11px]'
    ),
  
    md: clsx(
      'min-h-6',
      'px-2.5',
      'py-1',
      'text-xs'
    ),
  }
  
  /**
   * Status dot colors.
   *
   * Category dots use the exact color variables
   * defined in src/index.css.
   */
  const dotStyles: Record<BadgeVariant, string> = {
  
    neutral: 'bg-slate-500',
  
    info: 'bg-blue-500',
  
    success: 'bg-green-600',
  
    warning: 'bg-amber-500',
  
    danger: 'bg-red-600',
  
    customer: 'bg-[var(--color-field-customer)]',
  
    company: 'bg-[var(--color-field-company)]',
  
    job: 'bg-[var(--color-field-job)]',
  
    generic: 'bg-[var(--color-field-generic)]',
  }
  
  /* =========================================================
     Badge Component
     ========================================================= */
  
  /**
   * Reusable informational badge.
   *
   * Examples:
   *
   * <Badge>
   *   Pending
   * </Badge>
   *
   * <Badge variant="success">
   *   Completed
   * </Badge>
   *
   * <Badge variant="warning" showDot>
   *   Needs Review
   * </Badge>
   *
   * <Badge variant="customer">
   *   Customer
   * </Badge>
   *
   * <Badge variant="company" size="sm">
   *   Company
   * </Badge>
   *
   * A badge communicates status or classification.
   * Use the Button component for interactive actions.
   */
  export const Badge = forwardRef<
    HTMLSpanElement,
    BadgeProps
  >(function Badge(
    {
      children,
  
      variant = 'neutral',
      size = 'md',
  
      showDot = false,
  
      className,
  
      ...rest
    },
    ref
  ) {
  
    /**
     * Combine the standard badge styles with its
     * selected appearance, size, and custom classes.
     */
    const badgeClasses = clsx(
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      className
    )
  
    return (
      <span
        ref={ref}
        className={badgeClasses}
        {...rest}
      >
  
        {/* Optional status indicator */}
        {showDot && (
          <span
            className={clsx(
              'h-1.5',
              'w-1.5',
              'shrink-0',
              'rounded-full',
              dotStyles[variant]
            )}
            aria-hidden="true"
          />
        )}
  
        {/* Badge label */}
        <span className="min-w-0">
          {children}
        </span>
  
      </span>
    )
  })
  
  Badge.displayName = 'Badge'
  
  export default Badge