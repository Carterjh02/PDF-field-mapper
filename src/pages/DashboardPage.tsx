import type { ReactNode } from 'react'

import { Link, useNavigate } from 'react-router-dom'

import clsx from 'clsx'

import { Button } from '../components/common/Button'
import { Card, CardHeader, CardContent } from '../components/common/Card'
import { Badge } from '../components/common/Badge'

/* =========================================================
   PDF FIELD MAPPER
   Dashboard Page
   ========================================================= */

/**
 * Application Dashboard.
 *
 * This page provides:
 *
 * - A welcome banner
 * - Quick navigation actions
 * - Application statistics
 * - Recent documents
 * - Recent page templates
 * - Recent activity
 * - Getting-started information
 *
 * BACKEND INTEGRATION:
 *
 * The Dashboard currently uses placeholder statistics
 * and empty states.
 *
 * When backend services are implemented, these sections
 * will receive real data without requiring changes to
 * the overall page layout.
 */

/* =========================================================
   Dashboard Icons
   ========================================================= */

/**
 * Icons used throughout the Dashboard.
 *
 * These are defined locally to avoid introducing
 * another dependency during initial development.
 */
type DashboardIconName =
  | 'upload'
  | 'dictionary'
  | 'test'
  | 'settings'
  | 'document'
  | 'check'
  | 'spark'
  | 'layers'
  | 'clock'
  | 'arrow'
  | 'help'

interface DashboardIconProps {
  name: DashboardIconName
  className?: string
}

/**
 * Shared SVG icon component.
 *
 * All icons inherit their color from the parent,
 * allowing them to be styled using Tailwind classes.
 */
function DashboardIcon({
  name,
  className,
}: DashboardIconProps) {

  let content: ReactNode

  switch (name) {

    case 'upload':
      content = (
        <>
          <path d="M12 16V3" />
          <path d="m7 8 5-5 5 5" />
          <path d="M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
        </>
      )
      break

    case 'dictionary':
      content = (
        <>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <path d="M9 7h7" />
          <path d="M9 11h5" />
        </>
      )
      break

    case 'test':
      content = (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18" />
          <path d="m8 15 2 2 5-5" />
        </>
      )
      break

    case 'settings':
      content = (
        <>
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.8 1.8-.06-.06A1.7 1.7 0 0 0 16.06 18a1.7 1.7 0 0 0-1.06 1.56V20h-6v-.44A1.7 1.7 0 0 0 7.94 18a1.7 1.7 0 0 0-1.88.34l-.06.06-1.8-1.8.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.06H3v-3h.04A1.7 1.7 0 0 0 4.6 9.88a1.7 1.7 0 0 0-.34-1.88L4.2 7.94l1.8-1.8.06.06A1.7 1.7 0 0 0 7.94 6a1.7 1.7 0 0 0 1.06-1.56V4h6v.44A1.7 1.7 0 0 0 16.06 6a1.7 1.7 0 0 0 1.88-.34l.06-.06 1.8 1.8-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.56 1.06H21v3h-.04A1.7 1.7 0 0 0 19.4 15z" />
        </>
      )
      break

    case 'document':
      content = (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h6" />
        </>
      )
      break

    case 'check':
      content = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 2.5 2.5L16 9" />
        </>
      )
      break

    case 'spark':
      content = (
        <>
          <path d="m12 3 1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9L12 3z" />
          <path d="m19 18 .6 1.4L21 20l-1.4.6L19 22l-.6-1.4L17 20l1.4-.6L19 18z" />
        </>
      )
      break

    case 'layers':
      content = (
        <>
          <rect x="5" y="3" width="14" height="16" rx="2" />
          <path d="M9 7h6" />
          <path d="M9 11h6" />
          <path d="M3 7v12a2 2 0 0 0 2 2h10" />
        </>
      )
      break

    case 'clock':
      content = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      )
      break

    case 'arrow':
      content = (
        <>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </>
      )
      break

    case 'help':
      content = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2.5-2.5 4" />
          <path d="M12 17h.01" />
        </>
      )
      break

  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={clsx(
        'h-5',
        'w-5',
        'shrink-0',
        className
      )}
      aria-hidden="true"
    >
      {content}
    </svg>
  )
}

/* =========================================================
   Dashboard Data Definitions
   ========================================================= */

/**
 * Quick-action configuration.
 *
 * Each action links to an existing application route.
 *
 * These links work immediately because navigation
 * is already implemented through React Router.
 */
interface QuickAction {
  title: string
  description: string
  path: string
  icon: DashboardIconName
  iconBackground: string
  iconColor: string
}

const quickActions: QuickAction[] = [
  {
    title: 'Upload & Process',
    description:
      'Upload PDF documents and prepare them for field recognition.',
    path: '/upload',
    icon: 'upload',
    iconBackground: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },

  {
    title: 'Dictionary',
    description:
      'Manage available field keys and learned aliases.',
    path: '/dictionary',
    icon: 'dictionary',
    iconBackground: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },

  {
    title: 'Test Forms',
    description:
      'Verify mappings and test your prepared PDF forms.',
    path: '/test-forms',
    icon: 'test',
    iconBackground: 'bg-green-50',
    iconColor: 'text-green-600',
  },

  {
    title: 'Settings',
    description:
      'Configure application preferences and behavior.',
    path: '/settings',
    icon: 'settings',
    iconBackground: 'bg-slate-100',
    iconColor: 'text-slate-600',
  },
]

/**
 * Dashboard statistics.
 *
 * These are initial placeholder values.
 *
 * When Supabase and the processing engine are ready,
 * this data can be replaced with actual statistics.
 *
 * No fictional activity is displayed.
 */
interface DashboardStatistic {
  label: string
  value: number
  icon: DashboardIconName
  iconBackground: string
  iconColor: string
}

const dashboardStatistics: DashboardStatistic[] = [
  {
    label: 'Documents Processed',
    value: 0,
    icon: 'document',
    iconBackground: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },

  {
    label: 'Mappings Confirmed',
    value: 0,
    icon: 'check',
    iconBackground: 'bg-green-50',
    iconColor: 'text-green-600',
  },

  {
    label: 'Aliases Learned',
    value: 0,
    icon: 'spark',
    iconBackground: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },

  {
    label: 'Templates Saved',
    value: 0,
    icon: 'layers',
    iconBackground: 'bg-orange-50',
    iconColor: 'text-orange-600',
  },
]

/* =========================================================
   Reusable Dashboard Sections
   ========================================================= */

/**
 * Dashboard section heading.
 *
 * Used to keep section titles and optional descriptions
 * consistent throughout the page.
 */
interface SectionHeadingProps {
  id?: string
  title: string
  description?: string
  action?: ReactNode
}

function SectionHeading({
  id,
  title,
  description,
  action,
}: SectionHeadingProps) {

  return (
    <CardHeader
      className="flex flex-row items-start justify-between gap-4"
    >
      <div className="min-w-0">
        <h3
        id={id}
          className="text-base font-semibold text-[var(--color-text-primary)]"
        >
          {title}
        </h3>

        {description && (
          <p
            className="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]"
          >
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="shrink-0">
          {action}
        </div>
      )}
    </CardHeader>
  )
}

/* =========================================================
   Quick Action Card
   ========================================================= */

/**
 * Interactive navigation card.
 *
 * Uses React Router's Link component so navigation
 * does not reload the Electron application.
 */
function QuickActionCard({
  action,
}: {
  action: QuickAction
}) {

  return (
    <Link
      to={action.path}
      className={clsx(
        'group',
        'block',
        'h-full',
        'rounded-xl',
        'focus-visible:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-[var(--color-primary)]',
        'focus-visible:ring-offset-2'
      )}
    >
      <div
        className={clsx(
          'flex',
          'h-full',
          'min-h-40',
          'flex-col',
          'rounded-xl',
          'border',
          'border-[var(--color-border)]',
          'bg-white',
          'p-5',
          'transition-all',
          'duration-150',
          'hover:border-blue-200',
          'hover:shadow-md',
          'group-focus-visible:border-blue-300'
        )}
      >

        {/* Action icon */}
        <div
          className={clsx(
            'flex',
            'h-11',
            'w-11',
            'items-center',
            'justify-center',
            'rounded-xl',
            action.iconBackground,
            action.iconColor
          )}
        >
          <DashboardIcon name={action.icon} />
        </div>

        {/* Action title */}
        <div className="mt-4 flex items-center justify-between gap-2">

          <h4 className="text-sm font-semibold text-slate-800">
            {action.title}
          </h4>

          <DashboardIcon
            name="arrow"
            className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-600"
          />

        </div>

        {/* Action description */}
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          {action.description}
        </p>

      </div>
    </Link>
  )
}

/* =========================================================
   Statistics Card
   ========================================================= */

/**
 * Displays a single application statistic.
 *
 * Values are currently placeholders until
 * real application data becomes available.
 */
function StatisticCard({
  statistic,
}: {
  statistic: DashboardStatistic
}) {

  return (
    <div
      className={clsx(
        'rounded-xl',
        'border',
        'border-[var(--color-border)]',
        'bg-slate-50/70',
        'p-4'
      )}
    >

      <div className="flex items-center justify-between gap-3">

        <span
          className={clsx(
            'flex',
            'h-9',
            'w-9',
            'items-center',
            'justify-center',
            'rounded-lg',
            statistic.iconBackground,
            statistic.iconColor
          )}
        >
          <DashboardIcon
            name={statistic.icon}
            className="h-4 w-4"
          />
        </span>

      </div>

      <p
        className="mt-4 text-2xl font-bold tracking-tight text-[var(--color-text-primary)]"
      >
        {statistic.value.toLocaleString()}
      </p>

      <p className="mt-1 text-xs font-medium text-slate-500">
        {statistic.label}
      </p>

    </div>
  )
}

/* =========================================================
   Empty State
   ========================================================= */

/**
 * Reusable empty state for Dashboard sections
 * that don't contain application data yet.
 *
 * This prevents the interface from displaying
 * fabricated document history or activity.
 */
interface DashboardEmptyStateProps {
  icon: DashboardIconName
  title: string
  description: string
  action?: ReactNode
}

function DashboardEmptyState({
  icon,
  title,
  description,
  action,
}: DashboardEmptyStateProps) {

  return (
    <div
      className={clsx(
        'flex',
        'flex-col',
        'items-center',
        'justify-center',
        'px-5',
        'py-10',
        'text-center'
      )}
    >

      <div
        className={clsx(
          'flex',
          'h-12',
          'w-12',
          'items-center',
          'justify-center',
          'rounded-xl',
          'bg-slate-100',
          'text-slate-400'
        )}
      >
        <DashboardIcon
          name={icon}
          className="h-6 w-6"
        />
      </div>

      <h4 className="mt-4 text-sm font-semibold text-slate-700">
        {title}
      </h4>

      <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
        {description}
      </p>

      {action && (
        <div className="mt-5">
          {action}
        </div>
      )}

    </div>
  )
}

/* =========================================================
   Main Dashboard Page
   ========================================================= */

/**
 * Main Dashboard component.
 *
 * The shared application header and sidebar are rendered
 * by AppLayout.tsx.
 *
 * This component renders only the Dashboard's content.
 */
export function DashboardPage() {

  const navigate = useNavigate()

  return (
    <div
      className={clsx(
        'mx-auto',
        'w-full',
        'max-w-[1500px]',
        'space-y-6',
        'px-6',
        'py-7',
        'lg:px-8'
      )}
    >

      {/* ===================================================
          Welcome Banner
          =================================================== */}

      <section
        aria-labelledby="dashboard-welcome-title"
        className={clsx(
          'relative',
          'overflow-hidden',
          'rounded-2xl',
          'bg-gradient-to-r',
          'from-[#17345F]',
          'via-[#1D4684]',
          'to-[#2563EB]',
          'p-7',
          'text-white',
          'shadow-sm',
          'lg:p-8'
        )}
      >

        {/* Decorative background shapes */}
        <div
          className="pointer-events-none absolute -right-16 -top-28 h-72 w-72 rounded-full border border-white/15"
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute -right-4 top-8 h-48 w-48 rounded-full border border-white/15"
          aria-hidden="true"
        />

        <div className="relative z-10">

          {/* Welcome badge */}
          <span
            className={clsx(
              'inline-flex',
              'items-center',
              'rounded-full',
              'border',
              'border-white/20',
              'bg-white/10',
              'px-3',
              'py-1',
              'text-xs',
              'font-medium',
              'text-blue-50'
            )}
          >
            PDF Preparation Workspace
          </span>

          <h2
            id="dashboard-welcome-title"
            className={clsx(
              'mt-4',
              'text-2xl',
              'font-bold',
              'tracking-tight',
              'sm:text-3xl'
            )}
          >
            Welcome to PDF Field Mapper
          </h2>

          <p
            className={clsx(
              'mt-3',
              'max-w-2xl',
              'text-sm',
              'leading-relaxed',
              'text-blue-100'
            )}
          >
            Prepare, map, and test interactive PDF forms for
            PermitPapers.com. Manage field mappings, build your
            dictionary, and organize your document workflow
            from one workspace.
          </p>

          {/* Primary welcome actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">

            <Button
              variant="secondary"
              onClick={() => navigate('/upload')}
              className="bg-white text-blue-700 hover:bg-blue-50"
              leftIcon={
                <DashboardIcon
                  name="upload"
                  className="h-4 w-4"
                />
              }
            >
              Upload a PDF
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate('/dictionary')}
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              View Dictionary
            </Button>

          </div>

        </div>

      </section>

      {/* ===================================================
          Quick Actions and Statistics
          =================================================== */}

      <div
        className={clsx(
          'grid',
          'grid-cols-1',
          'gap-6',
          'xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]'
        )}
      >

        {/* ===============================================
            Quick Actions
            =============================================== */}

        <section aria-labelledby="quick-actions-title">

          <div className="mb-4">
            <h2
              id="quick-actions-title"
              className="text-lg font-semibold text-[var(--color-text-primary)]"
            >
              Quick Actions
            </h2>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Jump directly into your most common tasks.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            {quickActions.map((action) => (
              <QuickActionCard
                key={action.path}
                action={action}
              />
            ))}

          </div>

        </section>

        {/* ===============================================
            Quick Statistics
            =============================================== */}

        <section aria-labelledby="quick-stats-title">

          <div className="mb-4">
            <h2
              id="quick-stats-title"
              className="text-lg font-semibold text-[var(--color-text-primary)]"
            >
              Quick Stats
            </h2>

            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Your document processing overview.
            </p>
          </div>

          <Card className="h-full">

            <div className="mb-4 flex items-center justify-between gap-3">

              <span className="text-xs text-slate-500">
                Workspace Statistics
              </span>

              <Badge variant="neutral" size="sm">
                Preview Values
              </Badge>

            </div>

            <div className="grid grid-cols-2 gap-3">

              {dashboardStatistics.map((statistic) => (
                <StatisticCard
                  key={statistic.label}
                  statistic={statistic}
                />
              ))}

            </div>

            <p
              className="mt-4 text-xs leading-relaxed text-[var(--color-text-secondary)]"
            >
              Statistics will become available when document
              processing and database services are connected.
            </p>

          </Card>

        </section>

      </div>

      {/* ===================================================
          Recent Documents and Recent Activity
          =================================================== */}

      <div
        className={clsx(
          'grid',
          'grid-cols-1',
          'gap-6',
          'xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]'
        )}
      >

        {/* ===============================================
            Recent Documents
            =============================================== */}

        <section aria-labelledby="recent-documents-title">

          <Card
            padding="none"
            className="h-full overflow-hidden"
          >

            <div className="px-5 pt-5">

              <SectionHeading
                id="recent-documents-title"
                title="Recent Documents"
                description="PDF documents recently processed in your workspace."
                action={
                  <Badge variant="neutral" size="sm">
                    No Documents
                  </Badge>
                }
              />

            </div>

            {/* Table structure reserved for future records */}
            <div className="w-full overflow-x-auto">

              <table className="w-full min-w-[500px] text-left">

                <thead className="bg-slate-50">

                  <tr
                    className="border-y border-[var(--color-border)]"
                  >

                    <th className="px-5 py-3 text-xs font-semibold text-slate-500">
                      Document
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                      Status
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold text-slate-500">
                      Fields
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500">
                      Date
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {/*
                   * Document rows will be generated from
                   * actual processing history in the future.
                   *
                   * Until then, show a clear empty state.
                   */}
                  <tr>

                    <td colSpan={4}>

                      <DashboardEmptyState
                        icon="document"
                        title="No documents processed yet"
                        description="Once PDF processing is implemented, your recently processed documents will appear here."
                        action={
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/upload')}
                          >
                            Go to Upload & Process
                          </Button>
                        }
                      />

                    </td>

                  </tr>

                </tbody>

              </table>

            </div>

          </Card>

        </section>

        {/* ===============================================
            Recent Activity
            =============================================== */}

        <section aria-labelledby="recent-activity-title">

          <Card className="h-full">

            <SectionHeading
              id="recent-activity-title"
              title="Recent Activity"
              description="Your latest document and mapping operations."
            />

            <CardContent>

              <DashboardEmptyState
                icon="clock"
                title="No recent activity"
                description="Completed processing operations and mapping changes will appear here when activity tracking is implemented."
              />

            </CardContent>

          </Card>

        </section>

      </div>

      {/* ===================================================
          Page Templates and Getting Started
          =================================================== */}

      <div
        className={clsx(
          'grid',
          'grid-cols-1',
          'gap-6',
          'xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]'
        )}
      >

        {/* ===============================================
            Recent Page Templates
            =============================================== */}

        <section aria-labelledby="recent-templates-title">

          <Card className="h-full">

            <SectionHeading
              id="recent-templates-title"
              title="Recent Page Templates"
              description="Previously recognized document layouts and saved templates."
              action={
                <Badge variant="neutral" size="sm">
                  0 Saved
                </Badge>
              }
            />

            <CardContent>

              <DashboardEmptyState
                icon="layers"
                title="No page templates saved"
                description="Recognized PDF page layouts will appear here once template recognition and saving are implemented."
              />

            </CardContent>

          </Card>

        </section>

        {/* ===============================================
            Getting Started
            =============================================== */}

        <section aria-labelledby="getting-started-title">

          <Card
            className="h-full"
          >

            <SectionHeading
              id="getting-started-title"
              title="Getting Started"
              description="The workflow we're preparing for PDF Field Mapper."
            />

            <CardContent>

              <ol className="space-y-5">

                {/* Step 1 */}
                <li className="flex items-start gap-3">

                  <span
                    className={clsx(
                      'flex',
                      'h-7',
                      'w-7',
                      'shrink-0',
                      'items-center',
                      'justify-center',
                      'rounded-full',
                      'bg-blue-100',
                      'text-xs',
                      'font-semibold',
                      'text-blue-700'
                    )}
                  >
                    1
                  </span>

                  <div>

                    <h4 className="text-sm font-semibold text-slate-800">
                      Upload a PDF
                    </h4>

                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Select a document to inspect its existing
                      form fields.
                    </p>

                  </div>

                </li>

                {/* Step 2 */}
                <li className="flex items-start gap-3">

                  <span
                    className={clsx(
                      'flex',
                      'h-7',
                      'w-7',
                      'shrink-0',
                      'items-center',
                      'justify-center',
                      'rounded-full',
                      'bg-blue-100',
                      'text-xs',
                      'font-semibold',
                      'text-blue-700'
                    )}
                  >
                    2
                  </span>

                  <div>

                    <h4 className="text-sm font-semibold text-slate-800">
                      Review Field Mappings
                    </h4>

                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Confirm recognized fields and correct
                      anything that needs attention.
                    </p>

                  </div>

                </li>

                {/* Step 3 */}
                <li className="flex items-start gap-3">

                  <span
                    className={clsx(
                      'flex',
                      'h-7',
                      'w-7',
                      'shrink-0',
                      'items-center',
                      'justify-center',
                      'rounded-full',
                      'bg-blue-100',
                      'text-xs',
                      'font-semibold',
                      'text-blue-700'
                    )}
                  >
                    3
                  </span>

                  <div>

                    <h4 className="text-sm font-semibold text-slate-800">
                      Save & Test
                    </h4>

                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Save your prepared PDF and verify its
                      mappings using Test Forms.
                    </p>

                  </div>

                </li>

              </ol>

              {/* Information notice */}
              <div
                className={clsx(
                  'mt-6',
                  'rounded-lg',
                  'border',
                  'border-blue-100',
                  'bg-blue-50',
                  'p-4'
                )}
              >

                <div className="flex items-start gap-2">

                  <DashboardIcon
                    name="help"
                    className="h-4 w-4 text-blue-600"
                  />

                  <p className="text-xs leading-relaxed text-blue-800">
                    The interface is under development.
                    PDF processing and database features
                    will be connected in a later phase.
                  </p>

                </div>

              </div>

            </CardContent>

          </Card>

        </section>

      </div>

    </div>
  )
}

export default DashboardPage