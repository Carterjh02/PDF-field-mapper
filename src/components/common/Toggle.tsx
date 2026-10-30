import {
    forwardRef,
    useId,
    type InputHTMLAttributes,
  } from 'react'
  
  import clsx from 'clsx'
  
  /* =========================================================
     PDF FIELD MAPPER
     Reusable Toggle Component
     ========================================================= */
  
  /**
   * Available toggle sizes.
   */
  export type ToggleSize = 'sm' | 'md' | 'lg'
  
  /**
   * Toggle component properties.
   *
   * This component uses a native checkbox styled
   * as an on/off switch.
   *
   * Standard input properties are supported:
   *
   * - checked
   * - defaultChecked
   * - onChange
   * - disabled
   * - required
   * - name
   * - value
   */
  export interface ToggleProps
    extends Omit<
      InputHTMLAttributes<HTMLInputElement>,
      'type' | 'size'
    > {
  
    /**
     * Optional visible label.
     *
     * Example: "Enable Automatic Recognition"
     */
    label?: string
  
    /**
     * Optional explanatory text.
     *
     * Example:
     * "Automatically suggest mappings for PDF fields."
     */
    description?: string
  
    /**
     * Optional validation error message.
     */
    error?: string
  
    /**
     * Controls the toggle's size.
     *
     * Default: md
     */
    toggleSize?: ToggleSize
  
    /**
     * Additional classes for the outer container.
     *
     * The standard className property applies
     * to the switch track.
     */
    containerClassName?: string
  }
  
  /* =========================================================
     Toggle Styling
     ========================================================= */
  
  /**
   * Size definitions for the switch track.
   */
  const trackSizeStyles: Record<ToggleSize, string> = {
    sm: clsx(
      'h-5',
      'w-9',
  
      'after:h-4',
      'after:w-4',
  
      'peer-checked:after:translate-x-4'
    ),
  
    md: clsx(
      'h-6',
      'w-11',
  
      'after:h-5',
      'after:w-5',
  
      'peer-checked:after:translate-x-5'
    ),
  
    lg: clsx(
      'h-7',
      'w-13',
  
      'after:h-6',
      'after:w-6',
  
      'peer-checked:after:translate-x-6'
    ),
  }
  
  /**
   * Shared toggle track styles.
   *
   * The track changes color depending on the
   * native checkbox's checked state.
   */
  const baseTrackStyles = clsx(
    'relative',
    'inline-block',
    'shrink-0',
  
    'rounded-full',
  
    'bg-slate-300',
  
    'transition-colors',
    'duration-200',
  
    // Enabled appearance.
    'peer-checked:bg-[var(--color-primary)]',
  
    // Keyboard focus indication.
    'peer-focus-visible:ring-2',
    'peer-focus-visible:ring-[var(--color-primary)]',
    'peer-focus-visible:ring-offset-2',
  
    // Disabled appearance.
    'peer-disabled:opacity-50',
    'peer-disabled:cursor-not-allowed',
  
    // Toggle thumb.
    'after:content-[""]',
  
    'after:absolute',
    'after:top-0.5',
    'after:left-0.5',
  
    'after:rounded-full',
    'after:bg-white',
  
    'after:shadow-sm',
  
    'after:transition-transform',
    'after:duration-200'
  )
  
  /* =========================================================
     Toggle Component
     ========================================================= */
  
  /**
   * Reusable settings toggle.
   *
   * Example:
   *
   * <Toggle
   *   label="Enable Automatic Recognition"
   *   description="Automatically suggest field mappings."
   *   defaultChecked
   * />
   *
   * Controlled example:
   *
   * <Toggle
   *   label="Show Field Labels"
   *   checked={showLabels}
   *   onChange={(event) => {
   *     setShowLabels(event.target.checked)
   *   }}
   * />
   *
   * The component does not save settings itself.
   *
   * Settings persistence will be handled by
   * the parent component or application services.
   */
  export const Toggle = forwardRef<
    HTMLInputElement,
    ToggleProps
  >(function Toggle(
    {
      id,
  
      label,
      description,
      error,
  
      toggleSize = 'md',
  
      containerClassName,
      className,
  
      disabled,
      required,
  
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
  
      ...rest
    },
    ref
  ) {
  
    /* =======================================================
       Accessibility
       ======================================================= */
  
    /**
     * Generate a unique ID when one is not provided.
     */
    const generatedId = useId()
  
    const toggleId = id ?? generatedId
  
    const descriptionId = `${toggleId}-description`
    const errorId = `${toggleId}-error`
  
    /**
     * Determine whether a validation error exists.
     */
    const hasError = Boolean(error)
  
    /**
     * Associate the toggle with its description
     * and any validation error.
     *
     * Unlike a single-message input, a toggle can
     * expose both its description and an error.
     */
    const describedBy = [
      ariaDescribedBy,
  
      description ? descriptionId : undefined,
  
      hasError ? errorId : undefined,
    ]
      .filter(Boolean)
      .join(' ') || undefined
  
    /* =======================================================
       Styling
       ======================================================= */
  
    /**
     * Combine the standard track styles with
     * the selected size and custom classes.
     */
    const trackClasses = clsx(
      baseTrackStyles,
      trackSizeStyles[toggleSize],
  
      hasError && 'ring-1 ring-red-400',
  
      className
    )
  
    /* =======================================================
       Component Markup
       ======================================================= */
  
    return (
      <div
        className={clsx(
          'flex',
          'min-w-0',
          'flex-col',
          'gap-1.5',
  
          containerClassName
        )}
      >
  
        {/* Toggle label and switch */}
        <label
          htmlFor={toggleId}
          className={clsx(
            'flex',
            'w-fit',
            'max-w-full',
  
            'items-start',
            'gap-3',
  
            disabled
              ? 'cursor-not-allowed'
              : 'cursor-pointer'
          )}
        >
  
          {/* ===============================================
              Switch Control
              =============================================== */}
  
          <span
            className={clsx(
              'relative',
  
              'inline-flex',
              'shrink-0',
  
              'items-center'
            )}
          >
  
            {/* Native checkbox */}
            <input
              {...rest}
  
              ref={ref}
  
              id={toggleId}
  
              type="checkbox"
              role="switch"
  
              disabled={disabled}
              required={required}
  
              className={clsx(
                'peer',
  
                'absolute',
                'inset-0',
  
                'z-10',
  
                'h-full',
                'w-full',
  
                'cursor-pointer',
  
                'opacity-0',
  
                'disabled:cursor-not-allowed'
              )}
  
              aria-invalid={
                hasError ? true : ariaInvalid
              }
  
              aria-describedby={describedBy}
            />
  
            {/* Visual switch track and thumb */}
            <span
              className={trackClasses}
              aria-hidden="true"
            />
  
          </span>
  
          {/* ===============================================
              Label and Description
              =============================================== */}
  
          {(label || description) && (
            <span
              className={clsx(
                'flex',
                'min-w-0',
                'flex-col',
                'gap-1'
              )}
            >
  
              {/* Setting name */}
              {label && (
                <span
                  className={clsx(
                    'text-sm',
                    'font-medium',
  
                    disabled
                      ? 'text-slate-400'
                      : 'text-[var(--color-text-primary)]'
                  )}
                >
                  {label}
  
                  {/* Required indicator */}
                  {required && (
                    <span
                      className="ml-1 text-red-500"
                      aria-hidden="true"
                    >
                      *
                    </span>
                  )}
  
                </span>
              )}
  
              {/* Optional description */}
              {description && (
                <span
                  id={descriptionId}
                  className={clsx(
                    'text-xs',
                    'leading-relaxed',
  
                    disabled
                      ? 'text-slate-400'
                      : 'text-[var(--color-text-secondary)]'
                  )}
                >
                  {description}
                </span>
              )}
  
            </span>
          )}
  
        </label>
  
        {/* ===============================================
            Validation Error
            =============================================== */}
  
        {hasError && (
          <p
            id={errorId}
            className="text-xs text-red-600"
          >
            {error}
          </p>
        )}
  
      </div>
    )
  })
  
  /**
   * Display name for React Developer Tools.
   */
  Toggle.displayName = 'Toggle'
  
  export default Toggle