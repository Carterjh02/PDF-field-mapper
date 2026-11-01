// ============================================================
// PDF FIELD MAPPER
// Supabase Client
// ============================================================
//
// Centralized Supabase connection for the Electron/React app.
//
// RESPONSIBILITIES:
//
// - Initialize the Supabase JavaScript client.
// - Read client-safe environment variables.
// - Configure authentication session persistence.
// - Provide a reusable client for application services.
//
// IMPORTANT:
//
// The Supabase publishable key is not a secret.
//
// Database access is protected by Supabase Authentication
// and Row Level Security (RLS).
//
// NEVER include the following in renderer-side code:
//
// - PostgreSQL connection strings
// - Database passwords
// - Supabase service-role or secret API keys
//
// Prisma handles database migrations separately.
// ============================================================

import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js'

// ============================================================
// Environment Configuration
// ============================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * Ensure the required configuration exists.
 *
 * These values are injected by Vite when the application
 * is built or started in development mode.
 *
 * A missing value is a configuration error, so we fail
 * early with a descriptive message.
 */
if (!supabaseUrl) {
  throw new Error(
    'Supabase configuration error: VITE_SUPABASE_URL is missing.'
  )
}

if (!supabasePublishableKey) {
  throw new Error(
    'Supabase configuration error: VITE_SUPABASE_PUBLISHABLE_KEY is missing.'
  )
}

// ============================================================
// Client Initialization
// ============================================================

/**
 * Shared Supabase client.
 *
 * Authentication:
 *
 * persistSession:
 * Retains the authenticated session across application
 * launches using the renderer's local storage.
 *
 * autoRefreshToken:
 * Automatically refreshes access tokens when possible.
 *
 * detectSessionInUrl:
 * Disabled because our Electron application uses
 * HashRouter for navigation.
 *
 * Authentication callbacks requiring URL handling will
 * be implemented explicitly if needed in the future.
 *
 * SECURITY NOTE:
 *
 * Browser local storage is suitable for the initial
 * development implementation, but it is not encrypted
 * by the Windows operating system.
 *
 * Before distributing the finished application, we
 * should evaluate using Electron's secureStorage API
 * through a restricted preload interface.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
)

// ============================================================
// Export
// ============================================================

export default supabase