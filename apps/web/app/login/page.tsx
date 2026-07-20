'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) return
    setResetError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setResetError(error.message)
      return
    }
    setResetSent(true)
  }

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      router.push('/onboarding')
      router.refresh()
      return
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarded')
      .eq('id', data.user.id)
      .single()

    router.push(profile?.onboarded ? '/home' : '/onboarding')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: '40px 24px' }}>
      <div className="aw-container">
        <div style={{ width: '100%', maxWidth: 380, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src="/images/logo-wordmark.png" alt="Afterwords" style={{ display: 'block', width: 180, maxWidth: '100%', objectFit: 'contain', margin: '0 auto' }} />
        </div>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 500, color: '#3A3A38', marginBottom: 6, textAlign: 'center' }}>
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </div>
        <div style={{ fontSize: 14, color: '#8A8880', marginBottom: 28, textAlign: 'center' }}>
          {mode === 'signup' ? 'A few details to keep your journal with you.' : 'Log in to continue your reading journal.'}
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 100, padding: '13px', fontSize: 14, fontWeight: 600, color: '#3A3A38', cursor: 'pointer', marginBottom: 22 }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.12-.84 2.07-1.8 2.71v2.26h2.9c1.7-1.56 2.68-3.87 2.68-6.61z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33C2.44 15.98 5.48 18 9 18z"/><path fill="#FBBC05" d="M3.95 10.7c-.18-.54-.28-1.11-.28-1.7s.1-1.16.28-1.7V4.97H.96A8.997 8.997 0 000 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/></svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(51,50,74,0.15)' }} />
          <div style={{ fontSize: 12, color: '#8A8880' }}>or with email</div>
          <div style={{ flex: 1, height: 1, background: 'rgba(51,50,74,0.15)' }} />
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#5c5642', marginBottom: 6 }}>Email</div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#3f3b2e', marginBottom: 14, boxSizing: 'border-box' }}
          />

          <div style={{ fontSize: 12, fontWeight: 600, color: '#5c5642', marginBottom: 6 }}>Password</div>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{ width: '100%', background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 10, padding: '12px 44px 12px 14px', fontSize: 14, color: '#3f3b2e', boxSizing: 'border-box' }}
            />
            <div
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 600, color: '#8A8880', cursor: 'pointer' }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </div>
          </div>

          {mode === 'login' && (
            <div style={{ textAlign: 'right', marginBottom: 16 }}>
              <span onClick={() => setShowForgotPassword(true)} style={{ fontSize: 12.5, color: '#8A8880', cursor: 'pointer' }}>
                Forgot password?
              </span>
            </div>
          )}

          {error && <div style={{ color: '#a03', fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', background: '#3A3A38', color: '#f3ecdc', fontWeight: 600, fontSize: 15,
              padding: '15px', borderRadius: 100, border: 'none', cursor: 'pointer', opacity: loading ? 0.6 : 1, marginBottom: 16,
            }}
          >
            {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: 13, color: '#8A8880' }}>
          {mode === 'signup' ? (
            <>Already have an account? <span onClick={() => setMode('login')} style={{ fontWeight: 600, color: '#3A3A38', cursor: 'pointer' }}>Log in</span></>
          ) : (
            <>Don&apos;t have an account? <span onClick={() => setMode('signup')} style={{ fontWeight: 600, color: '#3A3A38', cursor: 'pointer' }}>Sign up</span></>
          )}
        </div>
      </div>
      </div>

      {showForgotPassword && (
        <div
          onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetError(null); setResetEmail('') }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(58,58,56,0.4)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#FAF9F6', width: '100%', maxWidth: 380, borderRadius: 20, padding: '26px 24px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', boxSizing: 'border-box' }}
          >
            {!resetSent ? (
              <>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 500, color: '#3A3A38', marginBottom: 6 }}>Reset your password</div>
                <div style={{ fontSize: 13, color: '#8A8880', marginBottom: 18 }}>We&apos;ll email you a link to reset it.</div>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Email"
                  style={{ width: '100%', background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#3f3b2e', marginBottom: 12, boxSizing: 'border-box' }}
                />
                {resetError && <div style={{ color: '#a03', fontSize: 13, marginBottom: 12 }}>{resetError}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <div onClick={() => setShowForgotPassword(false)} style={{ flex: 1, textAlign: 'center', border: '1.5px solid rgba(58,58,56,0.08)', borderRadius: 100, padding: 12, fontSize: 13, fontWeight: 600, color: '#3A3A38', cursor: 'pointer' }}>
                    Cancel
                  </div>
                  <div onClick={handleForgotPassword} style={{ flex: 1, textAlign: 'center', background: '#3A3A38', color: '#f3ecdc', fontWeight: 600, fontSize: 13, padding: 12, borderRadius: 100, cursor: 'pointer' }}>
                    Send link
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#3A3A38', marginBottom: 6 }}>Check your email</div>
                <div style={{ fontSize: 13, color: '#8A8880' }}>We sent a reset link to {resetEmail}.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
