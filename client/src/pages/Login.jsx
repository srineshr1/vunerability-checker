import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { postScan } from '../lib/api'
import { supabase } from '../lib/supabase'

export default function Login({ session, authReady }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [oauthLoading, setOauthLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()
  const loginHandledRef = useRef(false)
  const loading = oauthLoading || emailLoading

  const handlePostLoginRedirect = useCallback(async () => {
    const pendingDomain = sessionStorage.getItem('pending_domain')
    if (pendingDomain) {
      try {
        const { scanId } = await postScan(pendingDomain)
        sessionStorage.removeItem('pending_domain')
        navigate(`/dashboard/${scanId}`, { replace: true, state: { domain: pendingDomain } })
        return
      } catch {
        sessionStorage.removeItem('pending_domain')
      }
    }
    navigate('/home', { replace: true })
  }, [navigate])

  useEffect(() => {
    if (!authReady) return
    if (!session) {
      loginHandledRef.current = false
      return
    }
    if (loginHandledRef.current) return
    loginHandledRef.current = true
    handlePostLoginRedirect()
  }, [authReady, session, handlePostLoginRedirect])

  const formatAuthError = (message) => {
    const text = String(message ?? '').toLowerCase()
    if (text.includes('provider is not enabled')) {
      return 'Google sign-in is not enabled yet. Enable Google in Supabase Auth providers.'
    }
    if (text.includes('invalid login credentials')) {
      return 'Invalid email or password.'
    }
    if (text.includes('email not confirmed')) {
      return 'Please confirm your email before signing in.'
    }
    return message
  }

  const handleGoogleLogin = async () => {
    setOauthLoading(true)
    setError('')
    setNotice('')

    const redirectTo = `${window.location.origin}/login`
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })

    if (signInError) {
      setError(formatAuthError(signInError.message))
      setOauthLoading(false)
    }
  }

  const handleEmailAuth = async (event) => {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !password) {
      setError('Email and password are required.')
      setNotice('')
      return
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.')
        setNotice('')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        setNotice('')
        return
      }
    }

    setEmailLoading(true)
    setError('')
    setNotice('')

    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })
        if (signInError) throw signInError
        return
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          ...(fullName.trim() ? { data: { full_name: fullName.trim() } } : {}),
        },
      })
      if (signUpError) throw signUpError

      setPassword('')
      setConfirmPassword('')
      if (data.session) {
        setNotice('Account created. You are now signed in.')
      } else {
        setNotice('Account created. Check your email to confirm, then sign in.')
      }
    } catch (authError) {
      setError(formatAuthError(authError.message ?? 'Authentication failed'))
    } finally {
      setEmailLoading(false)
    }
  }

  const switchMode = (nextMode) => {
    if (loading || mode === nextMode) return
    setMode(nextMode)
    setError('')
    setNotice('')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm fade-up">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-8">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--amber)', boxShadow: '0 0 8px var(--amber-glow)' }}
            />
            <span className="text-sm font-medium tracking-tight" style={{ color: 'var(--text-0)' }}>ExposureIQ</span>
          </div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: 'var(--text-0)' }}
          >
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h1>
          <p className="text-[var(--text-2)] text-sm mt-1.5">Attack surface intelligence.</p>
        </div>

        <div className="space-y-4">
          <p className="text-[var(--text-2)] text-xs leading-relaxed">
            Use email/password or Google to save scans and activity in your shared Supabase workspace.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => switchMode('signin')}
              className={`btn w-full ${mode === 'signin' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Sign in
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => switchMode('signup')}
              className={`btn w-full ${mode === 'signup' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Sign up
            </button>
          </div>

          <form className="space-y-3" onSubmit={handleEmailAuth}>
            {mode === 'signup' && (
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Full name (optional)"
                autoComplete="name"
                disabled={loading}
                className="input w-full px-4 py-3"
              />
            )}

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
              className="input w-full px-4 py-3"
            />

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === 'signin' ? 'Password' : 'Create password'}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              disabled={loading}
              className="input w-full px-4 py-3"
            />

            {mode === 'signup' && (
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                disabled={loading}
                className="input w-full px-4 py-3"
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-accent w-full"
            >
              {emailLoading
                ? mode === 'signin' ? 'Signing in...' : 'Creating account...'
                : mode === 'signin' ? 'Continue with email' : 'Create account'}
            </button>
          </form>

          {error && (
            <p className="text-[var(--red)] text-xs">{error}</p>
          )}

          {notice && (
            <p className="text-[var(--green)] text-xs">{notice}</p>
          )}

          <div className="flex items-center gap-3 text-[10px] text-[var(--text-3)] uppercase tracking-widest">
            <span className="h-px flex-1 bg-[var(--border)]" />
            <span>or</span>
            <span className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="btn btn-ghost w-full"
          >
            {oauthLoading ? 'Redirecting...' : 'Continue with Google'}
          </button>
        </div>

        <p className="mt-6 text-[var(--text-3)] text-xs">Your account is managed by Supabase Auth.</p>
      </div>
    </div>
  )
}
