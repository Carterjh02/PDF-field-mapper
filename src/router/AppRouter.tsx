import {
    HashRouter,
    Routes,
    Route,
  } from 'react-router-dom'
  
  import clsx from 'clsx'
  
  import { AppLayout } from '../components/layouts/AppLayout'

  import { DashboardPage } from '../pages/DashboardPage'
  import { UploadProcessPage } from '../pages/UploadProcessPage'
  import { DictionaryPage } from '../pages/DictionaryPage'
  
  import {
    navigationItems,
    type NavigationItem,
  } from './navigation'
  
  /* =========================================================
     PDF FIELD MAPPER
     Application Router
     ========================================================= */
  
  /**
   * Central routing configuration for the desktop app.
   *
   * Responsibilities:
   *
   * - Initialize React Router.
   * - Connect navigation paths to application pages.
   * - Render all pages inside the shared AppLayout.
   * - Provide a fallback for unknown routes.
   *
   * HashRouter is used because Electron loads the
   * packaged application through the file:// protocol.
   */
  
  /* =========================================================
     Temporary Placeholder Page
     ========================================================= */
  
  /**
   * Properties for the temporary placeholder component.
   */
  interface PlaceholderPageProps {
    page: NavigationItem
  }
  
  /**
   * Temporary page displayed until the corresponding
   * application page has been implemented.
   *
   * This allows us to test the navigation system without
   * importing page files that are currently empty.
   *
   * As we develop each page, we'll replace its placeholder
   * route with the actual page component.
   *
   * This component is not intended for production.
   */
  function PlaceholderPage({
    page,
  }: PlaceholderPageProps) {
  
    return (
      <div
        className={clsx(
          'mx-auto',
          'w-full',
          'max-w-7xl',
          'p-8'
        )}
      >
  
        {/* ===============================================
            Temporary Page Content
            =============================================== */}
  
        <section
          aria-label={`${page.label} content`}
          className={clsx(
            'flex',
            'min-h-72',
            'flex-col',
  
            'items-center',
            'justify-center',
  
            'gap-4',
  
            'rounded-xl',
  
            'border',
            'border-dashed',
            'border-[var(--color-border)]',
  
            'bg-white',
  
            'p-8',
  
            'text-center'
          )}
        >
  
          {/* Decorative document icon */}
          <div
            className={clsx(
              'flex',
              'h-16',
              'w-16',
  
              'items-center',
              'justify-center',
  
              'rounded-2xl',
  
              'bg-blue-50',
  
              'text-[var(--color-primary)]'
            )}
            aria-hidden="true"
          >
  
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
  
              <path d="M14 2v6h6" />
  
              <path d="M8 13h8" />
              <path d="M8 17h6" />
            </svg>
  
          </div>
  
          {/* Placeholder heading */}
          <h2
            className={clsx(
              'text-xl',
              'font-semibold',
              'text-[var(--color-text-primary)]'
            )}
          >
            {page.label}
          </h2>
  
          {/* Placeholder description */}
          <p
            className={clsx(
              'max-w-md',
              'text-sm',
              'leading-relaxed',
              'text-[var(--color-text-secondary)]'
            )}
          >
            {page.description}
          </p>
  
          {/* Development status */}
          <span
            className={clsx(
              'mt-2',
              'inline-flex',
              'items-center',
  
              'rounded-full',
  
              'bg-blue-50',
  
              'px-3',
              'py-1.5',
  
              'text-xs',
              'font-medium',
  
              'text-blue-700'
            )}
          >
            Page Development Pending
          </span>
  
        </section>
  
      </div>
    )
  }
  
  /* =========================================================
     Not Found Page
     ========================================================= */
  
  /**
   * Fallback for unknown application routes.
   *
   * Prevents the application from displaying an
   * empty screen when an invalid route is requested.
   */
  function NotFoundPage() {
  
    return (
      <div
        className={clsx(
          'flex',
          'min-h-full',
  
          'items-center',
          'justify-center',
  
          'p-8'
        )}
      >
  
        <div className="max-w-md text-center">
  
          <h2
            className={clsx(
              'text-2xl',
              'font-bold',
              'text-[var(--color-text-primary)]'
            )}
          >
            Page Not Found
          </h2>
  
          <p
            className={clsx(
              'mt-3',
              'text-sm',
              'text-[var(--color-text-secondary)]'
            )}
          >
            The page you requested does not exist.
            Please choose a page from the sidebar.
          </p>
  
        </div>
  
      </div>
    )
  }
  
  /* =========================================================
     AppRouter Component
     ========================================================= */
  
  /**
   * Root application router.
   *
   * The shared AppLayout contains:
   *
   * - Sidebar
   * - Header
   * - Main content area
   *
   * Individual pages are nested inside the layout
   * and rendered through its Outlet component.
   *
   * Navigation routes are generated from the
   * centralized navigationItems configuration.
   *
   * NOTE:
   * When we begin implementing actual pages,
   * we'll replace the temporary PlaceholderPage
   * elements with their corresponding page components.
   */
  export function AppRouter() {
  
    return (
      <HashRouter>
  
        <Routes>
  
          {/* ===============================================
              Shared Application Layout
              =============================================== */}
  
          <Route
            path="/"
            element={<AppLayout />}
          >
  
            {/* ===========================================
                Application Pages
                =========================================== */}
  
            {navigationItems.map((page) => {
  
              /*
               * The root path must be registered as an
               * index route inside AppLayout.
               *
               * Other paths are registered as ordinary
               * child routes.
               */
              if (page.path === '/') {
  
                return (
                  <Route
                    key={page.path}
                    index
                    element={
                      <DashboardPage />
                    }
                  />
                )
              }
  
              /*
               * Remove the leading slash because these
               * routes are nested under the root layout.
               *
               * Example:
               *
               * '/dictionary' → 'dictionary'
               */
              const relativePath = page.path.replace(
                /^\//,
                ''
              )

              /**
                * Connect completed pages to their actual components.
                *
                * Pages that haven't been developed yet will continue
                * using the temporary PlaceholderPage component.
                */
                let pageElement = <PlaceholderPage page={page} />

                if (page.path === '/upload') {
                  pageElement = <UploadProcessPage />
                }

                if (page.path === '/dictionary') {
                  pageElement = <DictionaryPage />
                }
  
              return (
                <Route
                  key={page.path}
                  path={relativePath}
                  element={
                    pageElement
                  }
                />
              )
            })}
  
            {/* ===========================================
                Unknown Route Fallback
                =========================================== */}
  
            <Route
              path="*"
              element={<NotFoundPage />}
            />
  
          </Route>
  
        </Routes>
  
      </HashRouter>
    )
  }
  
  export default AppRouter