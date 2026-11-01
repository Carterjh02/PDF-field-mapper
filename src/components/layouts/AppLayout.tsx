import { useLocation, Outlet } from 'react-router-dom'
import clsx from 'clsx'

import { Sidebar } from './Sidebar'
import { Header } from './Header'

import { navigationItems } from '../../router/navigation'

import { AccountControls } from '../auth/AccountControls'

/* =========================================================
   PDF FIELD MAPPER
   Application Layout
   ========================================================= */

/**
 * Shared layout for the PDF Field Mapper application.
 *
 * Responsibilities:
 *
 * - Display the persistent application sidebar.
 * - Display the header for the active page.
 * - Render the current page through React Router.
 * - Manage the application's primary scrolling region.
 *
 * All application pages use this layout so navigation
 * and general styling remain consistent.
 */

/* =========================================================
   AppLayout Component
   ========================================================= */

export function AppLayout() {

  /**
   * React Router provides the current location.
   *
   * Because the application uses HashRouter, pathname
   * refers to the route inside the URL hash.
   *
   * Example:
   *
   * file:///.../index.html#/dictionary
   *
   * location.pathname === '/dictionary'
   */
  const location = useLocation()

  /* =======================================================
     Current Page Information
     ======================================================= */

  /**
   * Find the navigation item corresponding to the
   * current application route.
   *
   * Page titles and descriptions are defined centrally
   * in src/router/navigation.ts.
   *
   * This prevents duplicated navigation information.
   */
  const currentPage = navigationItems.find(
    (item) => item.path === location.pathname
  )

  /**
   * If the current route doesn't exist in the navigation
   * configuration, display a generic fallback header.
   *
   * This will be useful for our not-found page.
   */
  const pageTitle =
    currentPage?.label ?? 'Page Not Found'

  const pageDescription =
    currentPage?.description ??
    'The requested page could not be found.'

  /* =======================================================
     Application Layout
     ======================================================= */

  return (
    <div
      className={clsx(
        'flex',

        'h-screen',
        'w-screen',

        'min-h-0',
        'min-w-0',

        'overflow-hidden',

        'bg-[var(--color-background)]'
      )}
    >

      {/* ===================================================
          Persistent Application Sidebar
          =================================================== */}

      <Sidebar />

      {/* ===================================================
          Main Application Area
          =================================================== */}

      <div
        className={clsx(
          'flex',
          'min-h-0',
          'min-w-0',
          'flex-1',
          'flex-col',

          'overflow-hidden'
        )}
      >

        {/* ===============================================
            Shared Application Header
            =============================================== */}

        <Header
          title={pageTitle}
          description={pageDescription}
          actions={<AccountControls />}
        />

        {/* ===============================================
            Page Content Area
            =============================================== */}

        <main
          id="main-content"

          className={clsx(
            'min-h-0',
            'min-w-0',
            'flex-1',

            'overflow-x-hidden',
            'overflow-y-auto',

            'bg-[var(--color-background)]'
          )}
        >

          {/*
           * Outlet renders the active child route.
           *
           * Examples:
           *
           * /           → Dashboard
           * /upload     → Upload & Process
           * /editor     → PDF Editor
           * /dictionary → Dictionary
           * /test-forms → Test Forms
           * /settings   → Settings
           *
           * AppRouter determines which component
           * appears here.
           */}
          <Outlet />

        </main>

      </div>

    </div>
  )
}

export default AppLayout