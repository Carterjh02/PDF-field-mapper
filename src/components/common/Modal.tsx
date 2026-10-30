import {
    useEffect,
    useId,
    useRef,
    type ReactNode,
    type RefObject,
  } from 'react'
  
  import { createPortal } from 'react-dom'
  
  import clsx from 'clsx'
  
  /* =========================================================
     PDF FIELD MAPPER
     Reusable Modal Component
     ========================================================= */
  
  /**
   * Available modal sizes.
   */
  export type ModalSize =
    | 'sm'
    | 'md'
    | 'lg'
    | 'xl'
  
  /**
   * Modal component properties.
   */
  export interface ModalProps {
  
    /**
     * Controls whether the modal is visible.
     */
    isOpen: boolean
  
    /**
     * Called when the user requests to close the modal.
     *
     * The parent component is responsible for
     * updating the isOpen property.
     */
    onClose: () => void
  
    /**
     * Accessible dialog title.
     */
    title: string
  
    /**
     * Optional description displayed beneath the title.
     */
    description?: string
  
    /**
     * Main modal content.
     */
    children: ReactNode
  
    /**
     * Optional footer content.
     *
     * Usually contains reusable Button components.
     */
    footer?: ReactNode
  
    /**
     * Controls the modal's maximum width.
     *
     * Default: md
     */
    size?: ModalSize
  
    /**
     * Allows the modal to close when the user
     * clicks outside the dialog.
     *
     * Default: true
     */
    closeOnOverlayClick?: boolean
  
    /**
     * Allows the modal to close when Escape is pressed.
     *
     * Default: true
     */
    closeOnEscape?: boolean
  
    /**
     * Displays the close button in the header.
     *
     * Default: true
     */
    showCloseButton?: boolean
  
    /**
     * Optional reference to an element that should
     * receive initial keyboard focus.
     *
     * Useful when a modal contains an important
     * input field or a specific default action.
     */
    initialFocusRef?: RefObject<HTMLElement>
  }
  
  /* =========================================================
     Modal Styles
     ========================================================= */
  
  /**
   * Maximum width options.
   *
   * The modal always respects the available
   * application window width.
   */
  const sizeStyles: Record<ModalSize, string> = {
  
    sm: 'max-w-sm',
  
    md: 'max-w-lg',
  
    lg: 'max-w-2xl',
  
    xl: 'max-w-4xl',
  }
  
  /**
   * CSS selector used to identify elements that
   * can normally receive keyboard focus.
   */
  const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ')
  
  /* =========================================================
     Close Icon
     ========================================================= */
  
  /**
   * Simple SVG close icon.
   *
   * Defined locally so the component doesn't
   * depend on an external icon library.
   */
  function CloseIcon() {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    )
  }
  
  /* =========================================================
     Modal Component
     ========================================================= */
  
  /**
   * Reusable accessible modal dialog.
   *
   * Example:
   *
   * <Modal
   *   isOpen={isOpen}
   *   onClose={() => setIsOpen(false)}
   *   title="Delete Mapping"
   *   description="This action cannot be undone."
   *   footer={
   *     <>
   *       <Button variant="secondary">
   *         Cancel
   *       </Button>
   *
   *       <Button variant="danger">
   *         Delete
   *       </Button>
   *     </>
   *   }
   * >
   *   Are you sure you want to delete this mapping?
   * </Modal>
   *
   * The parent component manages modal visibility.
   */
  export function Modal({
    isOpen,
    onClose,
  
    title,
    description,
  
    children,
    footer,
  
    size = 'md',
  
    closeOnOverlayClick = true,
    closeOnEscape = true,
    showCloseButton = true,
  
    initialFocusRef,
  }: ModalProps) {
  
    /**
     * Reference to the modal dialog container.
     *
     * Used for initial focus and keyboard navigation.
     */
    const modalRef = useRef<HTMLDivElement>(null)
  
    /**
     * Reference to the close button.
     */
    const closeButtonRef = useRef<HTMLButtonElement>(null)
  
    /**
     * Unique IDs for the dialog's accessible
     * title and description.
     */
    const generatedId = useId()
  
    const titleId = `${generatedId}-title`
    const descriptionId = `${generatedId}-description`
  
    /* =======================================================
       Focus Management and Keyboard Handling
       ======================================================= */
  
    useEffect(() => {
      if (!isOpen) {
        return
      }
  
      /**
       * Remember the element that had focus before
       * the modal opened.
       *
       * We'll restore focus when the modal closes.
       */
      const previouslyFocusedElement =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
  
      /**
       * Prevent background scrolling while
       * the modal is visible.
       */
      const previousBodyOverflow =
        document.body.style.overflow
  
      document.body.style.overflow = 'hidden'
  
      /**
       * Return visible, enabled focusable elements
       * within the modal.
       */
      function getFocusableElements(): HTMLElement[] {
        if (!modalRef.current) {
          return []
        }
  
        const elements =
          modalRef.current.querySelectorAll<HTMLElement>(
            FOCUSABLE_SELECTOR
          )
  
        return Array.from(elements).filter((element) => {
          return (
            element.getClientRects().length > 0 &&
            element.getAttribute('aria-hidden') !== 'true'
          )
        })
      }
  
      /**
       * Move keyboard focus inside the modal.
       *
       * If an initial focus reference is provided,
       * use that element.
       *
       * Otherwise, focus the close button when
       * available, or the first focusable element.
       */
      const focusableElements = getFocusableElements()
  
      const initialFocusTarget =
        initialFocusRef?.current ??
        closeButtonRef.current ??
        focusableElements[0] ??
        modalRef.current
  
      initialFocusTarget?.focus()
  
      /**
       * Handle keyboard interaction while
       * the modal is open.
       */
      function handleKeyDown(event: KeyboardEvent) {
  
        // Close the dialog when Escape is enabled.
        if (event.key === 'Escape') {
  
          if (closeOnEscape) {
            event.preventDefault()
            event.stopPropagation()
  
            onClose()
          }
  
          return
        }
  
        // Keep keyboard focus inside the modal.
        if (event.key !== 'Tab') {
          return
        }
  
        const elements = getFocusableElements()
  
        /**
         * If there are no focusable controls,
         * keep focus on the dialog container.
         */
        if (elements.length === 0) {
          event.preventDefault()
          modalRef.current?.focus()
          return
        }
  
        const firstElement = elements[0]
        const lastElement = elements[elements.length - 1]
  
        const activeElement = document.activeElement
  
        const focusIsOutside =
          !modalRef.current?.contains(activeElement)
  
        /**
         * Recover focus if an external element
         * somehow receives keyboard focus.
         */
        if (focusIsOutside) {
          event.preventDefault()
  
          if (event.shiftKey) {
            lastElement.focus()
          } else {
            firstElement.focus()
          }
  
          return
        }
  
        // Shift + Tab from the first element.
        if (
          event.shiftKey &&
          activeElement === firstElement
        ) {
          event.preventDefault()
          lastElement.focus()
          return
        }
  
        // Tab from the last element.
        if (
          !event.shiftKey &&
          activeElement === lastElement
        ) {
          event.preventDefault()
          firstElement.focus()
          return
        }
  
        /**
         * If the dialog container itself has focus,
         * move to the appropriate interactive control.
         */
        if (activeElement === modalRef.current) {
          event.preventDefault()
  
          if (event.shiftKey) {
            lastElement.focus()
          } else {
            firstElement.focus()
          }
        }
      }
  
      document.addEventListener(
        'keydown',
        handleKeyDown,
        true
      )
  
      /**
       * Cleanup when the modal closes or unmounts.
       */
      return () => {
  
        document.removeEventListener(
          'keydown',
          handleKeyDown,
          true
        )
  
        // Restore the previous body scroll state.
        document.body.style.overflow =
          previousBodyOverflow
  
        // Return focus to the previous element.
        previouslyFocusedElement?.focus()
      }
  
    }, [
      isOpen,
      onClose,
      closeOnEscape,
      initialFocusRef,
    ])
  
    /* =======================================================
       Overlay Click Handling
       ======================================================= */
  
    /**
     * Close the modal when the user clicks the
     * background overlay, if enabled.
     *
     * Checking the event target prevents clicks
     * inside the dialog from closing it.
     */
    function handleOverlayClick(
      event: React.MouseEvent<HTMLDivElement>
    ) {
  
      if (!closeOnOverlayClick) {
        return
      }
  
      if (event.target === event.currentTarget) {
        onClose()
      }
    }
  
    /* =======================================================
       Conditional Rendering
       ======================================================= */
  
    /**
     * Don't render the modal while it is closed.
     *
     * Hooks remain above this condition to preserve
     * React's Rules of Hooks.
     */
    if (!isOpen) {
      return null
    }
  
    /* =======================================================
       Modal Markup
       ======================================================= */
  
    return createPortal(
      <div
        className={clsx(
          'fixed',
          'inset-0',
          'z-50',
  
          'flex',
          'items-center',
          'justify-center',
  
          'bg-slate-950/55',
  
          'p-4'
        )}
        onClick={handleOverlayClick}
      >
  
        {/* Modal dialog */}
        <div
          ref={modalRef}
  
          role="dialog"
          aria-modal="true"
  
          aria-labelledby={titleId}
  
          aria-describedby={
            description ? descriptionId : undefined
          }
  
          tabIndex={-1}
  
          className={clsx(
            'flex',
            'w-full',
            'max-h-[calc(100vh-2rem)]',
            'flex-col',
  
            'overflow-hidden',
  
            'rounded-xl',
  
            'bg-white',
  
            'shadow-2xl',
  
            'shadow-slate-950/20',
  
            sizeStyles[size]
          )}
        >
  
          {/* ===============================================
              Modal Header
              =============================================== */}
  
          <div
            className={clsx(
              'flex',
              'shrink-0',
              'items-start',
              'justify-between',
  
              'gap-4',
  
              'border-b',
              'border-[var(--color-border)]',
  
              'px-5',
              'py-4'
            )}
          >
  
            <div className="min-w-0 flex-1">
  
              {/* Modal title */}
              <h2
                id={titleId}
                className={clsx(
                  'text-lg',
                  'font-semibold',
                  'text-[var(--color-text-primary)]'
                )}
              >
                {title}
              </h2>
  
              {/* Optional description */}
              {description && (
                <p
                  id={descriptionId}
                  className={clsx(
                    'mt-1',
                    'text-sm',
                    'text-[var(--color-text-secondary)]'
                  )}
                >
                  {description}
                </p>
              )}
  
            </div>
  
            {/* Optional close button */}
            {showCloseButton && (
              <button
                ref={closeButtonRef}
  
                type="button"
  
                onClick={onClose}
  
                aria-label="Close dialog"
  
                className={clsx(
                  'inline-flex',
                  'h-8',
                  'w-8',
                  'shrink-0',
  
                  'items-center',
                  'justify-center',
  
                  'rounded-lg',
  
                  'text-slate-500',
  
                  'transition-colors',
  
                  'hover:bg-slate-100',
                  'hover:text-slate-800',
  
                  'focus-visible:outline-none',
                  'focus-visible:ring-2',
                  'focus-visible:ring-[var(--color-primary)]'
                )}
              >
                <CloseIcon />
              </button>
            )}
  
          </div>
  
          {/* ===============================================
              Modal Body
              =============================================== */}
  
          <div
            className={clsx(
              'min-h-0',
              'flex-1',
  
              'overflow-y-auto',
  
              'px-5',
              'py-5',
  
              'text-sm',
              'text-[var(--color-text-primary)]'
            )}
          >
            {children}
          </div>
  
          {/* ===============================================
              Modal Footer
              =============================================== */}
  
          {footer && (
            <div
              className={clsx(
                'flex',
                'shrink-0',
                'flex-wrap',
  
                'items-center',
                'justify-end',
  
                'gap-3',
  
                'border-t',
                'border-[var(--color-border)]',
  
                'bg-slate-50',
  
                'px-5',
                'py-4'
              )}
            >
              {footer}
            </div>
          )}
  
        </div>
  
      </div>,
      document.body
    )
  }
  
  export default Modal