import {
    forwardRef,
    useId,
    type InputHTMLAttributes,
    type ReactNode,
  } from 'react'
  
  import clsx from 'clsx'
  
  /* =========================================================
     PDF FIELD MAPPER
     Reusable Input Component
     ========================================================= */
  
  /**
   * Available input sizes.
   *
   * The name "inputSize" is used instead of "size"
   * to avoid conflicts with the native HTML input
   * size attribute.
   */
  export type InputSize = 'sm' | 'md' | 'lg'
  
  /**
   * Input component properties.
   *
   * Extending the native HTML input attributes allows
   * standard properties such as:
   *
   * - type
   * - value
   * - defaultValue
   * - onChange
   * - placeholder
   * - required
   * - disabled
   * - readOnly
   * - autoComplete
   */
  export interface InputProps
    extends InputHTMLAttributes<HTMLInputElement> {
  
    /**
     * Optional visible label displayed above the input.
     */
    label?: string
  
    /**
     * Optional supporting instructions.
     */
    helperText?: string
  
    /**
     * Optional validation error message.
     *
     * When provided, the input receives error styling
     * and the message is associated with the input
     * for accessibility.
     */
    error?: string
  
    /**
     * Controls the input's size.
     *
     * Default: md
     */
    inputSize?: InputSize
  
    /**
     * Expands the component to fill its parent.
     *
     * Default: true
     */
    fullWidth?: boolean
  
    /**
     * Optional decorative icon displayed on the left.
     */
    leftIcon?: ReactNode
  
    /**
     * Optional decorative icon displayed on the right.
     */
    rightIcon?: ReactNode
  
    /**
     * Additional classes applied to the outer container.
     *
     * The standard className property applies directly
     * to the HTML input element.
     */
    containerClassName?: string
  }
  
  /* =========================================================
     Input Styles
     ========================================================= */
  
  /**
   * Shared styles applied to every input.
   *
   * The component uses our global design tokens
   * defined in src/index.css.
   */
  const baseInputStyles = clsx(
    'block',
    'w-full',
    'min-w-0',
  
    'rounded-lg',
    'border',
  
    'bg-white',
  
    'font-normal',
  
    'outline-none',
  
    'transition-colors',
    'duration-150',
  
    'placeholder:text-slate-400',
  
    // Disabled appearance.
    'disabled:cursor-not-allowed',
    'disabled:bg-slate-100',
    'disabled:text-slate-500',
  
    // Read-only appearance.
    'read-only:bg-slate-50'
  )
  
  /**
   * Standard input appearance.
   */
  const normalInputStyles = clsx(
    'border-[var(--color-border)]',
  
    'text-[var(--color-text-primary)]',
  
    'hover:border-slate-300',
  
    'focus:border-[var(--color-primary)]',
  
    'focus:ring-2',
    'focus:ring-blue-100'
  )
  
  /**
   * Input appearance when validation fails.
   */
  const errorInputStyles = clsx(
    'border-red-400',
  
    'text-[var(--color-text-primary)]',
  
    'focus:border-red-500',
  
    'focus:ring-2',
    'focus:ring-red-100'
  )
  
  /**
   * Input size variants.
   *
   * Each size controls height, padding, and typography.
   */
  const sizeStyles: Record<InputSize, string> = {
  
    sm: clsx(
      'h-8',
      'px-3',
      'text-xs'
    ),
  
    md: clsx(
      'h-10',
      'px-3.5',
      'text-sm'
    ),
  
    lg: clsx(
      'h-12',
      'px-4',
      'text-base'
    ),
  }
  
  /* =========================================================
     Input Component
     ========================================================= */
  
  /**
   * Reusable text input.
   *
   * Examples:
   *
   * <Input
   *   label="Field Name"
   *   placeholder="Enter a field name"
   * />
   *
   * <Input
   *   label="Search Dictionary"
   *   placeholder="Search fields..."
   * />
   *
   * <Input
   *   label="Mapping Key"
   *   error="This field is required."
   * />
   *
   * <Input
   *   label="Company Name"
   *   disabled
   * />
   *
   * The component supports both controlled and
   * uncontrolled input usage.
   */
  export const Input = forwardRef<
    HTMLInputElement,
    InputProps
  >(function Input(
    {
      id,
  
      label,
      helperText,
      error,
  
      inputSize = 'md',
      fullWidth = true,
  
      leftIcon,
      rightIcon,
  
      containerClassName,
      className,
  
      required,
      disabled,
  
      type = 'text',
  
      'aria-describedby': ariaDescribedBy,
  
      ...rest
    },
    ref
  ) {
  
    /**
     * Generate a unique ID when one isn't provided.
     *
     * This ensures labels and helper messages
     * are associated with the correct input.
     */
    const generatedId = useId()
  
    const inputId = id ?? generatedId
  
    const helperTextId = `${inputId}-helper`
    const errorId = `${inputId}-error`
  
    /**
     * Determine whether a validation error exists.
     */
    const hasError = Boolean(error)
  
    /**
     * Associate the input with its supporting text.
     *
     * If an error exists, the error message takes
     * priority over the ordinary helper text.
     *
     * Existing aria-describedby values are preserved.
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
  
    /**
     * Combine the appropriate input styles.
     */
    const inputClasses = clsx(
      baseInputStyles,
  
      hasError
        ? errorInputStyles
        : normalInputStyles,
  
      sizeStyles[inputSize],
  
      // Make room for optional icons.
      leftIcon && 'pl-10',
      rightIcon && 'pr-10',
  
      className
    )
  
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
  
        {/* Optional input label */}
        {label && (
          <label
            htmlFor={inputId}
            className={clsx(
              'text-sm',
              'font-medium',
              'text-[var(--color-text-primary)]'
            )}
          >
            {label}
  
            {/* Visual indicator for required fields */}
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
  
        {/* Input and optional icon container */}
        <div className="relative">
  
          {/* Leading icon */}
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
  
          {/* Native HTML input */}
          <input
            {...rest}
  
            ref={ref}
  
            id={inputId}
  
            type={type}
  
            required={required}
            disabled={disabled}
  
            className={inputClasses}
  
            aria-invalid={
              hasError ? true : undefined
            }
  
            aria-describedby={describedBy}
          />
  
          {/* Trailing icon */}
          {rightIcon && (
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
              {rightIcon}
            </span>
          )}
  
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
  Input.displayName = 'Input'
  
  export default Input