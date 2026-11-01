// ============================================================
// PDF FIELD MAPPER
// Account Controls
// ============================================================
//
// PURPOSE:
//
// - Display the currently signed-in user's email.
// - Provide a Sign Out button.
// - Clear the authentication session when signing out.
// - Return the user to the Login page.
//
// This component is intended for the shared application
// header rather than any individual page.
//
// ============================================================

import {
  useEffect,
  useState,
} from 'react'

import { useNavigate } from 'react-router-dom'

import { Button } from '../common/Button'

import { supabase } from '../../lib/supabase/client'

import { signOut } from '../../lib/supabase/auth'

// ============================================================
// MAIN COMPONENT
// ============================================================

export function AccountControls() {
  const navigate = useNavigate()

  // ----------------------------------------------------------
  // Component State
  // ----------------------------------------------------------

  const [email, setEmail] = useState<string | null>(null)

  const [isSigningOut, setIsSigningOut] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')

  // ----------------------------------------------------------
  // Load and Monitor Account Information
  // ----------------------------------------------------------

  useEffect(() => {
    let isMounted = true

    /**
     * Display the user email from the current session.
     *
     * The email is informational only.
     *
     * Actual authorization is enforced separately by
     * RequireAuth and the Supabase RLS policies.
     */
    async function loadAccount() {
      const { data, error } =
        await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      if (error) {
        setEmail(null)
        return
      }

      setEmail(data.session?.user.email ?? null)
    }

    void loadAccount()

    /**
     * Keep the displayed account information synchronized
     * with Supabase authentication events.
     *
     * No additional Supabase requests are made inside
     * the authentication callback.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) {
          return
        }

        setEmail(session?.user.email ?? null)
      }
    )

    return () => {
      isMounted = false

      subscription.unsubscribe()
    }
  }, [])

  // ----------------------------------------------------------
  // Sign Out
  // ----------------------------------------------------------

  /**
   * Sign out through our centralized authentication
   * service.
   *
   * This clears the local Supabase session.
   *
   * After signing out, navigate to the public login page.
   */
  async function handleSignOut() {
    if (isSigningOut) {
      return
    }

    setErrorMessage('')
    setIsSigningOut(true)

    try {
      const result = await signOut()

      if (!result.success) {
        setErrorMessage(
          result.message ??
            'Unable to sign out. Please try again.'
        )

        return
      }

      navigate('/login', {
        replace: true,
      })
    } catch {
      setErrorMessage(
        'An unexpected error occurred while signing out.'
      )
    } finally {
      setIsSigningOut(false)
    }
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">

      {/* =====================================================
          Account Information
          ===================================================== */}

      <div className="hidden min-w-0 text-right md:block">

        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Signed In
        </p>

        <p
          className="max-w-[220px] truncate text-xs font-semibold text-slate-700"
          title={email ?? 'Authenticated User'}
        >
          {email ?? 'Authenticated User'}
        </p>

      </div>

      {/* =====================================================
          Sign Out Button
          ===================================================== */}

      <Button
        variant="outline"
        size="sm"
        disabled={isSigningOut}
        onClick={handleSignOut}
        title="Sign out of PDF Field Mapper"
      >
        {isSigningOut
          ? 'Signing Out...'
          : 'Sign Out'}
      </Button>

      {/* =====================================================
          Error Message
          ===================================================== */}

      {errorMessage && (
        <p
          role="alert"
          className="w-full text-right text-xs text-red-600"
        >
          {errorMessage}
        </p>
      )}

    </div>
  )
}

export default AccountControls