// ============================================================
// PDF FIELD MAPPER
// Supabase Authentication Service
// ============================================================
//
// RESPONSIBILITIES:
//
// - Authenticate users with email and password.
// - Verify existing Supabase sessions.
// - Verify administrator authorization.
// - Sign users out.
// - Provide consistent authentication results.
//
// SECURITY:
//
// - Credentials are sent directly to Supabase Auth.
// - Passwords are never stored by this application.
// - Administrator access is verified by the database.
// - The publishable key does not grant administrator access.
//
// ============================================================

import type { User } from '@supabase/supabase-js'

import { supabase } from './client'

// ============================================================
// Types
// ============================================================

/**
 * Represents the possible authentication states.
 *
 * AUTHORIZED:
 * The user is authenticated and is an approved administrator.
 *
 * SIGNED_OUT:
 * No authenticated session exists.
 *
 * UNAUTHORIZED:
 * The user is authenticated but is not an administrator.
 *
 * ERROR:
 * An authentication or authorization request failed.
 */
export type AuthStatus =
  | 'authorized'
  | 'signed_out'
  | 'unauthorized'
  | 'error'

export interface AuthState {
  status: AuthStatus
  user: User | null
  message: string | null
}

/**
 * Result returned by sign-in operations.
 */
export interface SignInResult {
  success: boolean
  message: string | null
}

// ============================================================
// Error Handling
// ============================================================

/**
 * Converts unexpected errors into readable messages.
 *
 * Avoid displaying raw exception objects in the interface.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred. Please try again.'
}

// ============================================================
// Authentication State
// ============================================================

/**
 * Determine whether the current user is authenticated
 * and authorized to access PDF Field Mapper.
 *
 * This function performs three checks:
 *
 * 1. Does a session exist?
 * 2. Is the user recognized by Supabase Auth?
 * 3. Is the user authorized by our database?
 *
 * getUser() verifies the identity with Supabase Auth.
 *
 * The is_mapper_admin() function performs the
 * administrator lookup inside PostgreSQL.
 */
export async function getAuthState(): Promise<AuthState> {
  try {
    // --------------------------------------------------------
    // Step 1: Check for an existing session.
    // --------------------------------------------------------

    const {
      data: sessionData,
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      return {
        status: 'error',
        user: null,
        message: sessionError.message,
      }
    }

    if (!sessionData.session) {
      return {
        status: 'signed_out',
        user: null,
        message: null,
      }
    }

    // --------------------------------------------------------
    // Step 2: Verify the authenticated user.
    // --------------------------------------------------------

    const {
      data: userData,
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      return {
        status: 'error',
        user: null,
        message:
          userError?.message ??
          'Unable to verify your authentication session.',
      }
    }

    const user = userData.user

    // --------------------------------------------------------
    // Step 3: Verify administrator authorization.
    // --------------------------------------------------------

    /**
     * This function was created in our initial
     * Supabase database migration.
     *
     * It checks whether auth.uid() exists in admin_users.
     *
     * The authorization decision occurs in PostgreSQL,
     * not in client-side JavaScript.
     */
    const {
      data: isAdmin,
      error: adminError,
    } = await supabase.rpc('is_mapper_admin')

    if (adminError) {
      return {
        status: 'error',
        user,
        message:
          'Unable to verify application permissions: ' +
          adminError.message,
      }
    }

    if (isAdmin !== true) {
      return {
        status: 'unauthorized',
        user,
        message:
          'Your account is not authorized to access PDF Field Mapper.',
      }
    }

    // --------------------------------------------------------
    // Authentication and authorization succeeded.
    // --------------------------------------------------------

    return {
      status: 'authorized',
      user,
      message: null,
    }
  } catch (error) {
    return {
      status: 'error',
      user: null,
      message: getErrorMessage(error),
    }
  }
}

// ============================================================
// Sign In
// ============================================================

/**
 * Sign in using Supabase email/password authentication.
 *
 * After Supabase authenticates the credentials, we
 * independently verify administrator authorization.
 *
 * Successful authentication alone is not sufficient
 * to access the application.
 */
export async function signIn(
  email: string,
  password: string
): Promise<SignInResult> {
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail || !password) {
    return {
      success: false,
      message: 'Please enter your email and password.',
    }
  }

  try {
    // --------------------------------------------------------
    // Step 1: Authenticate with Supabase.
    // --------------------------------------------------------

    const { error } =
      await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

    if (error) {
      return {
        success: false,
        message:
          'Unable to sign in. Please check your credentials and try again.',
      }
    }

    // --------------------------------------------------------
    // Step 2: Check authorization.
    // --------------------------------------------------------

    const authState = await getAuthState()

    if (authState.status === 'authorized') {
      return {
        success: true,
        message: null,
      }
    }

    // --------------------------------------------------------
    // Step 3: Reject unauthorized access.
    // --------------------------------------------------------

    /**
     * If the account is not authorized, clear the
     * authenticated session.
     *
     * This prevents the user from remaining signed in
     * without access to the application.
     */
    if (authState.status === 'unauthorized') {
      await supabase.auth.signOut({
        scope: 'local',
      })

      return {
        success: false,
        message:
          'This account is not authorized to use PDF Field Mapper.',
      }
    }

    // A verification error is different from a confirmed
    // authorization denial. Preserve the session so a
    // temporary network issue does not discard the login.
    return {
      success: false,
      message:
        authState.message ??
        'Unable to verify your account. Please try again.',
    }
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
    }
  }
}

// ============================================================
// Sign Out
// ============================================================

/**
 * Sign out the current user.
 *
 * Supabase clears the locally persisted authentication
 * session and emits an authentication state change.
 *
 * For this desktop application, we only need to clear
 * the current local session.
 */
export async function signOut(): Promise<SignInResult> {
  try {
    const { error } = await supabase.auth.signOut({
      scope: 'local',
    })

    if (error) {
      return {
        success: false,
        message: error.message,
      }
    }

    return {
      success: true,
      message: null,
    }
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
    }
  }
}