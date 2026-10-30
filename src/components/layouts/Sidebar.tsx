import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import clsx from 'clsx'

import {
  navigationItems,
  type NavigationIconName,
} from '../../router/navigation'

/* =========================================================
   PDF FIELD MAPPER
   Application Sidebar
   ========================================================= */

/**
 * The sidebar uses centralized navigation definitions
 * from src/router/navigation.ts.
 *
 * This keeps route configuration separate from React
 * components and avoids React Fast Refresh warnings.
 */

/* =========================================================
   Navigation Icons
   ========================================================= */

/**
 * Properties for the navigation icon renderer.
 */
interface NavigationIconProps {
  name: NavigationIconName
  className?: string
}

/**
 * Reusable navigation icon renderer.
 *
 * Icons are defined locally to avoid requiring an
 * external icon library during initial development.
 *
 * Each icon uses consistent dimensions, stroke width,
 * and styling.
 *
 * When introducing additional navigation items,
 * their icon definitions should be added here.
 */
function NavigationIcon({
  name,
  className,
}: NavigationIconProps) {

  let iconContent: ReactNode

  switch (name) {

    case 'dashboard':
      iconContent = (
        <>
          <rect
            x="3"
            y="3"
            width="7"
            height="7"
            rx="1"
          />

          <rect
            x="14"
            y="3"
            width="7"
            height="7"
            rx="1"
          />

          <rect
            x="3"
            y="14"
            width="7"
            height="7"
            rx="1"
          />

          <rect
            x="14"
            y="14"
            width="7"
            height="7"
            rx="1"
          />
        </>
      )
      break

    case 'upload':
      iconContent = (
        <>
          <path d="M12 16V3" />
          <path d="m7 8 5-5 5 5" />
          <path d="M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
        </>
      )
      break

    case 'editor':
      iconContent = (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />

          <path d="M14 2v6h6" />

          <path d="M8 13h8" />

          <path d="M8 17h5" />

          <path d="m15 18 4-4 2 2-4 4-3 1z" />
        </>
      )
      break

    case 'dictionary':
      iconContent = (
        <>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />

          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />

          <path d="M9 7h7" />

          <path d="M9 11h5" />
        </>
      )
      break

    case 'test':
      iconContent = (
        <>
          <rect
            x="3"
            y="4"
            width="18"
            height="16"
            rx="2"
          />

          <path d="M3 9h18" />

          <path d="m8 15 2 2 5-5" />
        </>
      )
      break

    case 'settings':
      iconContent = (
        <>
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />

          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.8 1.8-.06-.06A1.7 1.7 0 0 0 16.06 18a1.7 1.7 0 0 0-1.06 1.56V20h-6v-.44A1.7 1.7 0 0 0 7.94 18a1.7 1.7 0 0 0-1.88.34l-.06.06-1.8-1.8.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.06H3v-3h.04A1.7 1.7 0 0 0 4.6 9.88a1.7 1.7 0 0 0-.34-1.88L4.2 7.94l1.8-1.8.06.06A1.7 1.7 0 0 0 7.94 6a1.7 1.7 0 0 0 1.06-1.56V4h6v.44A1.7 1.7 0 0 0 16.06 6a1.7 1.7 0 0 0 1.88-.34l.06-.06 1.8 1.8-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.56 1.06H21v3h-.04A1.7 1.7 0 0 0 19.4 15z" />
        </>
      )
      break

  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {iconContent}
    </svg>
  )
}

/* =========================================================
   Application Logo
   ========================================================= */

/**
 * Initial document-themed application logo.
 *
 * This is a temporary visual mark for the
 * application interface.
 *
 * The finalized application logo and Windows
 * installer icon can be added later.
 */
function ApplicationLogo() {

  return (
    <div
      className={clsx(
        'flex',
        'h-10',
        'w-10',
        'shrink-0',
        'items-center',
        'justify-center',
        'rounded-xl',
        'bg-[var(--color-primary)]',
        'text-white'
      )}
      aria-hidden="true"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />

        <path d="M14 2v6h6" />

        <rect
          x="8"
          y="12"
          width="3"
          height="3"
          rx=".4"
        />

        <rect
          x="13"
          y="12"
          width="3"
          height="3"
          rx=".4"
        />

        <rect
          x="8"
          y="17"
          width="3"
          height="2"
          rx=".4"
        />
      </svg>
    </div>
  )
}

/* =========================================================
   Sidebar Component
   ========================================================= */

/**
 * Shared application sidebar.
 *
 * Responsibilities:
 *
 * - Display application branding
 * - Render primary navigation links
 * - Highlight the current page
 * - Support keyboard-accessible navigation
 *
 * Navigation definitions are imported from
 * src/router/navigation.ts.
 *
 * React Router's NavLink component determines
 * the active navigation item automatically.
 *
 * IMPORTANT:
 * Sidebar must be rendered inside a React
 * Router provider.
 */
export function Sidebar() {

  return (
    <aside
      className={clsx(
        'flex',
        'h-full',
        'w-64',
        'shrink-0',
        'flex-col',
        'border-r',
        'border-white/10',
        'bg-[var(--color-sidebar)]',
        'text-white'
      )}
    >

      {/* ===================================================
          Application Branding
          =================================================== */}

      <div
        className={clsx(
          'flex',
          'min-h-20',
          'shrink-0',
          'items-center',
          'gap-3',
          'border-b',
          'border-white/10',
          'px-5'
        )}
      >

        <ApplicationLogo />

        <div className="min-w-0">

          <p
            className={clsx(
              'truncate',
              'text-sm',
              'font-bold',
              'tracking-wide',
              'text-white'
            )}
          >
            PDF Field Mapper
          </p>

          <p
            className={clsx(
              'mt-0.5',
              'text-xs',
              'text-slate-400'
            )}
          >
            Document Workspace
          </p>

        </div>

      </div>

      {/* ===================================================
          Primary Navigation
          =================================================== */}

      <nav
        aria-label="Primary navigation"
        className={clsx(
          'min-h-0',
          'flex-1',
          'overflow-y-auto',
          'px-3',
          'py-5'
        )}
      >

        {/* Navigation section heading */}
        <p
          className={clsx(
            'mb-3',
            'px-3',
            'text-[11px]',
            'font-semibold',
            'uppercase',
            'tracking-wider',
            'text-slate-400'
          )}
        >
          Workspace
        </p>

        {/* Navigation links */}
        <div className="space-y-1">

          {navigationItems.map((item) => (

            <NavLink
              key={item.path}
              to={item.path}

              /**
               * The Dashboard route should only be
               * active when the path is exactly "/".
               */
              end={item.path === '/'}

              className={({ isActive }) =>
                clsx(
                  'group',
                  'flex',
                  'min-h-11',
                  'items-center',
                  'gap-3',
                  'rounded-lg',
                  'px-3',
                  'py-2.5',
                  'text-sm',
                  'font-medium',
                  'transition-colors',
                  'duration-150',

                  // Keyboard focus styling.
                  'focus-visible:outline-none',
                  'focus-visible:ring-2',
                  'focus-visible:ring-blue-400',

                  // Active or inactive appearance.
                  isActive
                    ? clsx(
                        'bg-[var(--color-primary)]',
                        'text-white',
                        'shadow-sm'
                      )
                    : clsx(
                        'text-slate-300',
                        'hover:bg-white/10',
                        'hover:text-white'
                      )
                )
              }
            >

              {/* Navigation icon */}
              <NavigationIcon
                name={item.icon}
                className="shrink-0"
              />

              {/* Navigation label */}
              <span className="min-w-0 truncate">
                {item.label}
              </span>

            </NavLink>

          ))}

        </div>

      </nav>

      {/* ===================================================
          Sidebar Footer
          =================================================== */}

      <div
        className={clsx(
          'shrink-0',
          'border-t',
          'border-white/10',
          'px-5',
          'py-4'
        )}
      >

        <div className="flex items-center gap-2">

          {/* Decorative application indicator */}
          <span
            className={clsx(
              'h-2',
              'w-2',
              'shrink-0',
              'rounded-full',
              'bg-blue-400'
            )}
            aria-hidden="true"
          />

          <span className="text-xs text-slate-400">
            Desktop Application
          </span>

        </div>

      </div>

    </aside>
  )
}

export default Sidebar