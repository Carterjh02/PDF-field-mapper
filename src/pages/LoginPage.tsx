// ============================================================
// PDF FIELD MAPPER
// Login Page and Authentication Guard
// ============================================================
//
// LoginPage:
//
// - Displays the application login interface.
// - Authenticates users with Supabase.
// - Displays authentication errors.
// - Redirects authorized users to the Dashboard.
//
// RequireAuth:
//
// - Protects the existing application layout.
// - Checks persisted authentication sessions.
// - Verifies administrator access.
// - Redirects unauthorized users to the Login page.
//
// ============================================================

import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'

import {
  Navigate,
  useNavigate,
} from 'react-router-dom'

import {
  getAuthState,
  signIn,
  signOut,
  type AuthState,
} from '../lib/supabase/auth'

import { supabase } from '../lib/supabase/client'

// ============================================================
// Types
// ============================================================

interface RequireAuthProps {
  children: ReactNode
}

// ============================================================
// Loading Screen
// ============================================================

/**
 * Displayed while an existing authentication session
 * is being verified.
 */
function AuthenticationLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">

      <div className="flex flex-col items-center text-center">

        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"
          role="status"
          aria-label="Checking authentication"
        />

        <h2 className="mt-5 text-base font-semibold text-slate-800">
          PDF Field Mapper
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Verifying your session...
        </p>

      </div>

    </div>
  )
}

// ============================================================
// Authentication Guard
// ============================================================

/**
 * Protects the application's main pages.
 *
 * This component must wrap AppLayout in AppRouter.
 *
 * Existing pages are not rendered until the current
 * session has passed our administrator check.
 */
export function RequireAuth({
  children,
}: RequireAuthProps) {
  const [authState, setAuthState] =
    useState<AuthState | null>(null)

  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let isMounted = true

    // Ignore responses from older authorization requests.
    let requestNumber = 0

    /**
     * Verify the current authentication state.
     *
     * Request numbering prevents a slow, older response
     * from replacing a newer authentication result.
     */
    async function verifyAccess() {
      const currentRequest = ++requestNumber

      const result = await getAuthState()

      if (
        !isMounted ||
        currentRequest !== requestNumber
      ) {
        return
      }

      setAuthState(result)
    }

    void verifyAccess()

    /**
     * Listen for Supabase authentication changes.
     *
     * IMPORTANT:
     * We schedule verification outside the synchronous
     * auth callback to avoid making awaited Supabase
     * requests inside onAuthStateChange.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!isMounted) {
        return
      }

      if (event === 'SIGNED_OUT') {
        ++requestNumber

        setAuthState({
          status: 'signed_out',
          user: null,
          message: null,
        })

        return
      }

      if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        window.setTimeout(() => {
          if (isMounted) {
            void verifyAccess()
          }
        }, 0)
      }
    })

    return () => {
      isMounted = false

      ++requestNumber

      subscription.unsubscribe()
    }
  }, [retryCount])

  // ----------------------------------------------------------
  // Loading
  // ----------------------------------------------------------

  if (!authState) {
    return <AuthenticationLoading />
  }

  // ----------------------------------------------------------
  // Authorized
  // ----------------------------------------------------------

  if (authState.status === 'authorized') {
    return <>{children}</>
  }

  // ----------------------------------------------------------
  // Authentication error
  // ----------------------------------------------------------

  /**
   * Temporary network errors should not automatically
   * be treated as authorization failures.
   *
   * Provide a retry option so an authenticated user
   * can recover without unnecessarily signing out.
   */
  if (authState.status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">

        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">

          <h2 className="text-lg font-semibold text-slate-800">
            Unable to Verify Session
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            {authState.message ??
              'Authentication verification failed.'}
          </p>

          <button
            type="button"
            onClick={() => {
              setAuthState(null)
              setRetryCount((count) => count + 1)
            }}
            className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Try Again
          </button>

          <button
            type="button"
            onClick={() => {
              void signOut()
            }}
            className="ml-3 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            Sign Out
          </button>

        </div>

      </div>
    )
  }

  // ----------------------------------------------------------
  // Not authorized or not signed in
  // ----------------------------------------------------------

  if (authState.status === 'unauthorized') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">

        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">

          <h2 className="text-lg font-semibold text-slate-800">
            Access Not Authorized
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Your account is authenticated but has not
            been authorized to use PDF Field Mapper.
          </p>

          <button
            type="button"
            onClick={() => {
              void signOut()
            }}
            className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Return to Login
          </button>

        </div>

      </div>
    )
  }

  return <Navigate to="/login" replace />
}

// ============================================================
// Login Page
// ============================================================

export function LoginPage() {
  const navigate = useNavigate()

  // ----------------------------------------------------------
  // Form State
  // ----------------------------------------------------------

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [isLoading, setIsLoading] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')

  // ----------------------------------------------------------
  // Sign-In Handler
  // ----------------------------------------------------------

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (isLoading) {
      return
    }

    setErrorMessage('')
    setIsLoading(true)

    try {
      const result = await signIn(email, password)

      if (!result.success) {
        setErrorMessage(
          result.message ?? 'Unable to sign in.'
        )

        return
      }

      // Never retain the entered password in component state
      // after successful authentication.
      setPassword('')

      navigate('/', {
        replace: true,
      })
    } catch {
      setErrorMessage(
        'An unexpected error occurred during sign in.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // ==========================================================
  // Page Markup
  // ==========================================================

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-10">

      <div className="w-full max-w-[440px]">

        {/* ===================================================
            Branding
            =================================================== */}

        <div className="mb-8 text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#14243a] shadow-lg">

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-9 w-9 text-white"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M8 13h8" />
              <path d="M8 17h6" />
            </svg>

          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-800">
            PDF Field Mapper
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sign in to access your mapping workspace.
          </p>

        </div>

        {/* ===================================================
            Login Card
            =================================================== */}

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">

          <div className="mb-6">

            <h2 className="text-lg font-semibold text-slate-800">
              Welcome Back
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Enter your authorized account credentials.
            </p>

          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* Email */}

            <div>

              <label
                htmlFor="login-email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email Address
              </label>

              <input
                id="login-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="you@example.com"
                disabled={isLoading}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
              />

            </div>

            {/* Password */}

            <div>

              <label
                htmlFor="login-password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter your password"
                disabled={isLoading}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
              />

            </div>

            {/* Error Message */}

            {errorMessage && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700"
              >
                {errorMessage}
              </div>
            )}

            {/* Submit */}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading
                ? 'Signing In...'
                : 'Sign In'}
            </button>

          </form>

        </div>

        {/* ===================================================
            Footer
            =================================================== */}

        <div className="mt-6 text-center">

          <p className="text-xs leading-relaxed text-slate-500">
            Access is restricted to authorized PDF Field Mapper users.
          </p>

          <p className="mt-2 text-xs text-slate-400">
            PermitPapers.com
          </p>

        </div>

      </div>

    </div>
  )
}

export default LoginPage