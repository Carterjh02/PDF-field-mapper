/* =========================================================
   PDF FIELD MAPPER
   Centralized Navigation Configuration
   ========================================================= */

/**
 * Supported navigation icon names.
 *
 * Each name corresponds to an SVG icon implemented
 * in the Sidebar component.
 *
 * When adding a new icon, update this type and the
 * NavigationIcon component in Sidebar.tsx.
 */
export type NavigationIconName =
  | 'dashboard'
  | 'upload'
  | 'editor'
  | 'dictionary'
  | 'test'
  | 'settings'

/**
 * Definition of an application navigation item.
 *
 * label:
 *   Text displayed in the sidebar and page header.
 *
 * path:
 *   React Router route associated with the page.
 *
 * description:
 *   Supporting information displayed in the header.
 *
 * icon:
 *   Name of the icon displayed in the sidebar.
 */
export interface NavigationItem {
  label: string
  path: string
  description: string
  icon: NavigationIconName
}

/* =========================================================
   Primary Application Navigation
   ========================================================= */

/**
 * Centralized navigation configuration.
 *
 * This array defines the application's primary pages.
 *
 * It will be shared between:
 *
 * - Sidebar.tsx
 * - AppLayout.tsx
 * - AppRouter.tsx (where appropriate)
 *
 * Keeping navigation information in one place prevents
 * inconsistent page titles, descriptions, and routes.
 *
 * IMPORTANT:
 * Adding an item here does not automatically create
 * its React Router route. New routes must also be
 * registered in AppRouter.tsx.
 */
export const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/',
    description:
      'Overview of your PDF field mapping workspace.',
    icon: 'dashboard',
  },

  {
    label: 'Upload & Process',
    path: '/upload',
    description:
      'Upload PDF documents and analyze their fields.',
    icon: 'upload',
  },

  {
    label: 'PDF Editor',
    path: '/editor',
    description:
      'Review, create, and modify PDF field mappings.',
    icon: 'editor',
  },

  {
    label: 'Dictionary',
    path: '/dictionary',
    description:
      'Manage recognized field names and learned aliases.',
    icon: 'dictionary',
  },

  {
    label: 'Test Forms',
    path: '/test-forms',
    description:
      'Test PDF forms and verify field mappings.',
    icon: 'test',
  },

  {
    label: 'Settings',
    path: '/settings',
    description:
      'Configure application settings and preferences.',
    icon: 'settings',
  },
]