import {
    forwardRef,
    type HTMLAttributes,
  } from 'react'
  
  import clsx from 'clsx'
  
  /* =========================================================
     PDF FIELD MAPPER
     Reusable Card Components
     ========================================================= */
  
  /**
   * Available card appearance variants.
   *
   * default  - Standard application card with subtle shadow.
   * outlined - Border-only card without a shadow.
   * elevated - Card with a more prominent shadow.
   */
  export type CardVariant =
    | 'default'
    | 'outlined'
    | 'elevated'
  
  /**
   * Available card padding sizes.
   *
   * none - No internal padding.
   * sm   - Compact padding.
   * md   - Standard padding.
   * lg   - Spacious padding.
   */
  export type CardPadding =
    | 'none'
    | 'sm'
    | 'md'
    | 'lg'
  
  /**
   * Card component properties.
   *
   * Extending HTMLAttributes<HTMLDivElement> allows standard
   * HTML properties such as:
   *
   * - id
   * - title
   * - role
   * - aria-label
   * - onClick
   * - className
   */
  export interface CardProps
    extends HTMLAttributes<HTMLDivElement> {
  
    /**
     * Controls the visual appearance of the card.
     *
     * Default: default
     */
    variant?: CardVariant
  
    /**
     * Controls the card's internal padding.
     *
     * Default: md
     */
    padding?: CardPadding
  }
  
  /**
   * Properties shared by the optional card sections.
   */
  export interface CardSectionProps
    extends HTMLAttributes<HTMLDivElement> {}
  
  /* =========================================================
     Card Styles
     ========================================================= */
  
  /**
   * Base styles applied to every card.
   *
   * Global color variables are defined in src/index.css.
   */
  const baseStyles = clsx(
    'w-full',
    'min-w-0',
    'rounded-xl',
    'bg-[var(--color-surface)]',
    'text-[var(--color-text-primary)]'
  )
  
  /**
   * Card appearance variants.
   */
  const variantStyles: Record<CardVariant, string> = {
  
    default: clsx(
      'border',
      'border-[var(--color-border)]',
      'shadow-sm'
    ),
  
    outlined: clsx(
      'border',
      'border-[var(--color-border)]',
      'shadow-none'
    ),
  
    elevated: clsx(
      'border',
      'border-[var(--color-border)]',
      'shadow-lg',
      'shadow-slate-200/50'
    ),
  }
  
  /**
   * Card padding variants.
   */
  const paddingStyles: Record<CardPadding, string> = {
  
    none: 'p-0',
  
    sm: 'p-3',
  
    md: 'p-5',
  
    lg: 'p-7',
  }
  
  /* =========================================================
     Main Card Component
     ========================================================= */
  
  /**
   * Reusable application card.
   *
   * Examples:
   *
   * <Card>
   *   <p>Card content</p>
   * </Card>
   *
   * <Card variant="outlined">
   *   <p>Outlined card</p>
   * </Card>
   *
   * <Card variant="elevated" padding="lg">
   *   <p>Elevated card</p>
   * </Card>
   *
   * Cards can contain any React content, including other
   * reusable components.
   */
  export const Card = forwardRef<
    HTMLDivElement,
    CardProps
  >(function Card(
    {
      children,
  
      variant = 'default',
      padding = 'md',
  
      className,
  
      ...rest
    },
    ref
  ) {
  
    /**
     * Combine base styles, appearance, padding,
     * and optional custom classes.
     */
    const cardClasses = clsx(
      baseStyles,
      variantStyles[variant],
      paddingStyles[padding],
      className
    )
  
    return (
      <div
        ref={ref}
        className={cardClasses}
        {...rest}
      >
        {children}
      </div>
    )
  })
  
  Card.displayName = 'Card'
  
  /* =========================================================
     Card Header
     ========================================================= */
  
  /**
   * Optional header section.
   *
   * Intended for titles, descriptions, or header actions.
   *
   * The component does not force a heading level.
   * Pages should use appropriate h1-h6 elements based
   * on their document structure.
   *
   * Example:
   *
   * <CardHeader>
   *   <h2>Dictionary Overview</h2>
   *   <p>Manage recognized PDF field names.</p>
   * </CardHeader>
   */
  export const CardHeader = forwardRef<
    HTMLDivElement,
    CardSectionProps
  >(function CardHeader(
    {
      children,
      className,
      ...rest
    },
    ref
  ) {
  
    return (
      <div
        ref={ref}
        className={clsx(
          'mb-4',
          'flex',
          'flex-col',
          'gap-1',
          className
        )}
        {...rest}
      >
        {children}
      </div>
    )
  })
  
  CardHeader.displayName = 'CardHeader'
  
  /* =========================================================
     Card Content
     ========================================================= */
  
  /**
   * Main content area of a card.
   *
   * Example:
   *
   * <CardContent>
   *   <p>150 fields recognized</p>
   * </CardContent>
   */
  export const CardContent = forwardRef<
    HTMLDivElement,
    CardSectionProps
  >(function CardContent(
    {
      children,
      className,
      ...rest
    },
    ref
  ) {
  
    return (
      <div
        ref={ref}
        className={clsx(
          'min-w-0',
          className
        )}
        {...rest}
      >
        {children}
      </div>
    )
  })
  
  CardContent.displayName = 'CardContent'
  
  /* =========================================================
     Card Footer
     ========================================================= */
  
  /**
   * Optional footer for card actions.
   *
   * The footer is visually separated from the
   * main card content by a subtle border.
   *
   * Example:
   *
   * <CardFooter>
   *   <Button>Save Changes</Button>
   * </CardFooter>
   */
  export const CardFooter = forwardRef<
    HTMLDivElement,
    CardSectionProps
  >(function CardFooter(
    {
      children,
      className,
      ...rest
    },
    ref
  ) {
  
    return (
      <div
        ref={ref}
        className={clsx(
          'mt-5',
          'flex',
          'flex-wrap',
          'items-center',
          'gap-3',
          'border-t',
          'border-[var(--color-border)]',
          'pt-4',
          className
        )}
        {...rest}
      >
        {children}
      </div>
    )
  })
  
  CardFooter.displayName = 'CardFooter'
  
  export default Card