import {
    forwardRef,
    useId,
    type ReactNode,
    type SelectHTMLAttributes,
  } from 'react'
  
  import clsx from 'clsx'
  
  /* =========================================================
     PDF FIELD MAPPER
     Reusable Select Component
     ========================================================= */
  
  /**
   * Available dropdown sizes.
   *
   * We use "selectSize" rather than "size" to avoid
   * conflicting with the native HTML select size attribute.
   */
  export type SelectSize = 'sm' | 'md' | 'lg'
  
  /**
   * Select component properties.
   *
   * Standard HTML select attributes are supported,
   * including:
   *
   * - value
   * - defaultValue
   * - onChange
   * - name
   * - required
   * - disabled
   * - autoFocus
   *
   * This component is designed for single selections.
   * Multiple selections can be handled by a separate
   * component if needed.
   */
  export interface SelectProps
    extends Omit<
      SelectHTMLAttributes<HTMLSelectElement>,
      'size' | 'multiple'
    > {
  
    /**
     * Optional label displayed above the dropdown.
     */
    label?: string
  
    /**
     * Optional placeholder displayed as a disabled option.
     *
     * Example: "Select a field category"
     */
    placeholder?: string
  
    /**
     * Optional instructions displayed beneath the dropdown.
     */
    helperText?: string
  
    /**
     * Optional validation error message.
     *
     * When provided, the dropdown receives error styling.
     */
    error?: string
  
    /**
     * Controls the dropdown size.
     *
     * Default: md
     */
    selectSize?: SelectSize
  
    /**
     * Expands the component to fill its parent.
     *
     * Default: true
     */
    fullWidth?: boolean
  
    /**
     * Optional decorative icon displayed inside
     * the left side of the dropdown.
     */
    leftIcon?: ReactNode
  
    /**
     * Additional styling for the outer container.
     *
     * The standard className property applies
     * directly to the select element.
     */
    containerClassName?: string
  
    /**
     * Dropdown options.
     *
     * Accepts native <option> and <optgroup> elements.
     */
    children: ReactNode
  }
  
  /* =========================================================
     Select Styling
     ========================================================= */
  
  /**
   * Shared dropdown styling.
   *
   * Uses the same general design as Input.tsx.
   */
  const baseSelectStyles = clsx(
    'block',
    'w-full',
    'min-w-0',
  
    'appearance-none',
  
    'rounded-lg',
    'border',
  
    'bg-white',
  
    'font-normal',
  
    'outline-none',
  
    'transition-colors',
    'duration-150',
  
    'cursor-pointer',
  
    // Leave room for the dropdown arrow.
    'pr-10',
  
    // Disabled appearance.
    'disabled:cursor-not-allowed',
    'disabled:bg-slate-100',
    'disabled:text-slate-500'
  )
  
  /**
   * Standard dropdown appearance.
   */
  const normalSelectStyles = clsx(
    'border-[var(--color-border)]',
  
    'text-[var(--color-text-primary)]',
  
    'hover:border-slate-300',
  
    'focus:border-[var(--color-primary)]',
  
    'focus:ring-2',
    'focus:ring-blue-100'
  )
  
  /**
   * Dropdown appearance when validation fails.
   */
  const errorSelectStyles = clsx(
    'border-red-400',
  
    'text-[var(--color-text-primary)]',
  
    'focus:border-red-500',
  
    'focus:ring-2',
    'focus:ring-red-100'
  )
  
  /**
   * Available dropdown sizes.
   */
  const sizeStyles: Record<SelectSize, string> = {
    sm: clsx(
      'h-8',
      'pl-3',
      'text-xs'
    ),
  
    md: clsx(
      'h-10',
      'pl-3.5',
      'text-sm'
    ),
  
    lg: clsx(
      'h-12',
      'pl-4',
      'text-base'
    ),
  }
  
  /* =========================================================
     Dropdown Arrow
     ========================================================= */
  
  /**
   * Custom dropdown arrow.
   *
   * The native dropdown remains fully functional.
   * This icon only replaces its visual arrow.
   */
  function ChevronDownIcon() {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    )
  }
  
  /* =========================================================
     Select Component
     ========================================================= */
  
  /**
   * Reusable dropdown component.
   *
   * Example:
   *
   * <Select
   *   label="Field Category"
   *   placeholder="Select a category"
   * >
   *   <option value="customer">Customer</option>
   *   <option value="company">Company</option>
   *   <option value="job">Job / Property</option>
   *   <option value="generic">Generic</option>
   * </Select>
   *
   * The component supports controlled and uncontrolled
   * usage through the standard HTML select properties.
   */
  export const Select = forwardRef<
    HTMLSelectElement,
    SelectProps
  >(function Select(
    {
      id,
  
      label,
      placeholder,
      helperText,
      error,
  
      selectSize = 'md',
      fullWidth = true,
  
      leftIcon,
  
      containerClassName,
      className,
  
      children,
  
      required,
      disabled,
  
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
     * Generate a unique ID when the parent
     * does not provide one.
     */
    const generatedId = useId()
  
    const selectId = id ?? generatedId
  
    const helperTextId = `${selectId}-helper`
    const errorId = `${selectId}-error`
  
    /**
     * Determine whether the component
     * should display an error.
     */
    const hasError = Boolean(error)
  
    /**
     * Associate helper text or validation errors
     * with the dropdown.
     *
     * Preserve any existing aria-describedby value.
     */
    const describedBy = [
      ariaDescribedBy,
  
      hasError
        ? errorId
        : helperText
          ? helperTextId
          : undefined,
    ]
      .filter(Boolean)
      .join(' ') || undefined
  
    /* =======================================================
       Styling
       ======================================================= */
  
    /**
     * Combine shared styles with the selected
     * size, validation state, and custom classes.
     */
    const selectClasses = clsx(
      baseSelectStyles,
  
      hasError
        ? errorSelectStyles
        : normalSelectStyles,
  
      sizeStyles[selectSize],
  
      // Make room for the optional leading icon.
      leftIcon && 'pl-10',
  
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
  
          fullWidth ? 'w-full' : 'w-auto',
  
          containerClassName
        )}
      >
  
        {/* Optional dropdown label */}
        {label && (
          <label
            htmlFor={selectId}
            className={clsx(
              'text-sm',
              'font-medium',
              'text-[var(--color-text-primary)]'
            )}
          >
            {label}
  
            {/* Required field indicator */}
            {required && (
              <span
                className="ml-1 text-red-500"
                aria-hidden="true"
              >
                *
              </span>
            )}
          </label>
        )}
  
        {/* Dropdown container */}
        <div className="relative">
  
          {/* Optional leading icon */}
          {leftIcon && (
            <span
              className={clsx(
                'pointer-events-none',
                'absolute',
                'inset-y-0',
                'left-3',
  
                'flex',
                'items-center',
  
                'text-slate-400'
              )}
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}
  
          {/* Native HTML select element */}
          <select
            {...rest}
  
            ref={ref}
  
            id={selectId}
  
            required={required}
            disabled={disabled}
  
            className={selectClasses}
  
            aria-invalid={
              hasError ? true : ariaInvalid
            }
  
            aria-describedby={describedBy}
          >
  
            {/* Optional initial placeholder */}
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
  
            {/* Dropdown options */}
            {children}
  
          </select>
  
          {/* Custom dropdown arrow */}
          <span
            className={clsx(
              'pointer-events-none',
  
              'absolute',
              'inset-y-0',
              'right-3',
  
              'flex',
              'items-center',
  
              'text-slate-400'
            )}
            aria-hidden="true"
          >
            <ChevronDownIcon />
          </span>
  
        </div>
  
        {/* Validation error */}
        {hasError && (
          <p
            id={errorId}
            className="text-xs text-red-600"
          >
            {error}
          </p>
        )}
  
        {/* Supporting helper text */}
        {!hasError && helperText && (
          <p
            id={helperTextId}
            className={clsx(
              'text-xs',
              'text-[var(--color-text-secondary)]'
            )}
          >
            {helperText}
          </p>
        )}
  
      </div>
    )
  })
  
  /**
   * Display name for React Developer Tools.
   */
  Select.displayName = 'Select'
  
  export default Select