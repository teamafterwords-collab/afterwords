'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }
    router.push('/home')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#efe6d3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ fontFamily: 'Lora, serif', fontSize: 24, fontWeight: 700, color: '#33324a', marginBottom: 6, textAlign: 'center' }}>Set a new password</div>
        <div style={{ fontSize: 13, color: '#8d8570', marginBottom: 24, textAlign: 'center' }}>Choose a new password for your account.</div>

        <form onSubmit={handleSubmit}>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{ width: '100%', background: '#fbf6ec', border: '1px solid rgba(51,50,74,0.14)', borderRadius: 10, padding: '12px 44px 12px 14px', fontSize: 14, color: '#3f3b2e', boxSizing: 'border-box' }}
            />
            <div
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 600, color: '#8d8570', cursor: 'pointer' }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </div>
          </div>

          {error && <div style={{ color: '#a03', fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <button
            type="submit"
            disabled={saving}
            style={{ width: '100%', background: '#33324a', color: '#f3ecdc', fontWeight: 600, fontSize: 15, padding: 15, borderRadius: 100, border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}