import {
    forwardRef,
    type ButtonHTMLAttributes,
    type ReactNode,
  } from 'react'
  
  import clsx from 'clsx'
  
  /* =========================================================
     PDF FIELD MAPPER
     Reusable Button Component
     ========================================================= */
  
  /**
   * Available button appearance variants.
   *
   * Each variant represents a different level of visual
   * importance or action type within the application.
   */
  export type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'danger'
  
  /**
   * Available button sizes.
   */
  export type ButtonSize = 'sm' | 'md' | 'lg'
  
  /**
   * Button component properties.
   *
   * Extending the native HTML button attributes allows
   * standard properties such as:
   *
   * - onClick
   * - disabled
   * - title
   * - aria-label
   * - type
   *
   * to work without additional configuration.
   */
  export interface ButtonProps
    extends ButtonHTMLAttributes<HTMLButtonElement> {
  
    /**
     * Determines the visual appearance of the button.
     *
     * Default: primary
     */
    variant?: ButtonVariant
  
    /**
     * Determines the button's size.
     *
     * Default: md
     */
    size?: ButtonSize
  
    /**
     * Displays a loading spinner and prevents interaction.
     *
     * Default: false
     */
    isLoading?: boolean
  
    /**
     * Expands the button to fill its parent container.
     *
     * Default: false
     */
    fullWidth?: boolean
  
    /**
     * Optional icon displayed before the button label.
     */
    leftIcon?: ReactNode
  
    /**
     * Optional icon displayed after the button label.
     */
    rightIcon?: ReactNode
  }
  
  /* =========================================================
     Button Styling
     ========================================================= */
  
  /**
   * Shared styles applied to every button.
   *
   * These establish consistent alignment, transitions,
   * keyboard focus indicators, and disabled behavior.
   */
  const baseStyles = clsx(
    'inline-flex items-center justify-center',
    'gap-2',
    'rounded-lg',
    'font-medium',
    'whitespace-nowrap',
    'transition-colors duration-150',
    'select-none',
  
    // Keyboard accessibility.
    'focus-visible:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-[var(--color-primary)]',
    'focus-visible:ring-offset-2',
  
    // Disabled state.
    'disabled:cursor-not-allowed',
    'disabled:opacity-50'
  )
  
  /**
   * Appearance variants.
   *
   * These colors match the global design tokens defined
   * in src/index.css.
   */
  const variantStyles: Record<ButtonVariant, string> = {
  
    primary: clsx(
      'bg-[var(--color-primary)]',
      'text-white',
      'hover:bg-[var(--color-primary-hover)]'
    ),
  
    secondary: clsx(
      'bg-slate-100',
      'text-[var(--color-text-primary)]',
      'hover:bg-slate-200'
    ),
  
    outline: clsx(
      'border border-[var(--color-border)]',
      'bg-white',
      'text-[var(--color-text-primary)]',
      'hover:bg-slate-50'
    ),
  
    ghost: clsx(
      'bg-transparent',
      'text-[var(--color-text-primary)]',
      'hover:bg-slate-100'
    ),
  
    danger: clsx(
      'bg-red-600',
      'text-white',
      'hover:bg-red-700'
    ),
  }
  
  /**
   * Size variants.
   *
   * Each size controls the button's minimum height,
   * horizontal padding, and text size.
   */
  const sizeStyles: Record<ButtonSize, string> = {
  
    sm: clsx(
      'min-h-8',
      'px-3',
      'text-xs'
    ),
  
    md: clsx(
      'min-h-10',
      'px-4',
      'text-sm'
    ),
  
    lg: clsx(
      'min-h-12',
      'px-5',
      'text-base'
    ),
  }
  
  /* =========================================================
     Loading Spinner
     ========================================================= */
  
  /**
   * Small loading indicator displayed inside buttons.
   *
   * Uses Tailwind's animation utilities and inherits
   * the current button text color.
   */
  function LoadingSpinner() {
    return (
      <span
        className={clsx(
          'inline-block',
          'h-4 w-4',
          'shrink-0',
          'animate-spin',
          'rounded-full',
          'border-2',
          'border-current',
          'border-t-transparent'
        )}
        aria-hidden="true"
      />
    )
  }
  
  /* =========================================================
     Button Component
     ========================================================= */
  
  /**
   * Reusable Button component.
   *
   * Examples:
   *
   * <Button>Save Changes</Button>
   *
   * <Button variant="secondary">
   *   Cancel
   * </Button>
   *
   * <Button variant="danger">
   *   Delete Field
   * </Button>
   *
   * <Button isLoading>
   *   Processing PDF...
   * </Button>
   *
   * <Button size="sm" fullWidth>
   *   Continue
   * </Button>
   *
   * The component uses forwardRef so parent components
   * can access the underlying HTML button element.
   */
  export const Button = forwardRef<
    HTMLButtonElement,
    ButtonProps
  >(function Button(
    {
      children,
  
      variant = 'primary',
      size = 'md',
  
      isLoading = false,
      fullWidth = false,
  
      leftIcon,
      rightIcon,
  
      className,
      disabled,
  
      type = 'button',
  
      ...rest
    },
    ref
  ) {
  
    /**
     * Prevent interaction while the button is loading
     * or explicitly disabled.
     */
    const isDisabled = disabled || isLoading
  
    /**
     * Combine shared, variant, size, and optional custom
     * styles into the final class list.
     */
    const buttonClasses = clsx(
      baseStyles,
  
      variantStyles[variant],
      sizeStyles[size],
  
      fullWidth && 'w-full',
  
      className
    )
  
    return (
      <button
        ref={ref}
  
        type={type}
  
        className={buttonClasses}
  
        disabled={isDisabled}
  
        aria-busy={isLoading || undefined}
  
        {...rest}
      >
  
        {/* Loading spinner or leading icon */}
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          leftIcon && (
            <span
              className="inline-flex shrink-0 items-center"
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )
        )}
  
        {/* Button label */}
        {children}
  
        {/* Trailing icon */}
        {!isLoading && rightIcon && (
          <span
            className="inline-flex shrink-0 items-center"
            aria-hidden="true"
          >
            {rightIcon}
          </span>
        )}
  
      </button>
    )
  })
  
  /**
   * Display name for React Developer Tools.
   */
  Button.displayName = 'Button'
  
  export default Button