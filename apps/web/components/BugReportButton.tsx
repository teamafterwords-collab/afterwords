'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { submitBugReport } from '@/utils/supabase/queries'

export default function BugReportButton() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (pathname === '/' || pathname === '/login') return null

  const handleSubmit = async () => {
    if (!message.trim()) return
    setSaving(true)
    await submitBugReport(pathname, message)
    setSaving(false)
    setSubmitted(true)
    setTimeout(() => {
      setOpen(false)
      setSubmitted(false)
      setMessage('')
    }, 1500)
  }

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', left: 'calc(50% - 280px + 16px)', bottom: 92, zIndex: 60,
          width: 40, height: 40, borderRadius: '50%', background: '#3A3A38',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        }}
        title="Report a bug"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 2v12" stroke="#f3ecdc" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M3 2.5c1.5-1 3.5-1 5 0s3.5 1 5 0v6c-1.5 1-3.5 1-5 0s-3.5-1-5 0" stroke="#f3ecdc" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
        </svg>
      </div>

      {open && (
        <div
          onClick={() => !saving && setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(58,58,56,0.4)', zIndex: 70, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#FAF9F6', width: '100%', maxWidth: 560, borderRadius: '22px 22px 0 0', padding: '26px 22px 30px', boxShadow: '0 -10px 30px rgba(0,0,0,0.2)' }}
          >
            {!submitted ? (
              <>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 500, color: '#3A3A38', marginBottom: 4 }}>Report a bug</div>
                <div style={{ fontSize: 12.5, color: '#8A8880', marginBottom: 16 }}>What went wrong? We&apos;ll capture the page you&apos;re on automatically.</div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe what happened…"
                  style={{ width: '100%', minHeight: 110, background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 12, padding: 14, fontSize: 14, lineHeight: 1.6, color: '#3f3b2e', resize: 'vertical', marginBottom: 16, boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <div onClick={() => setOpen(false)} style={{ flex: 1, textAlign: 'center', border: '1.5px solid rgba(58,58,56,0.08)', borderRadius: 100, padding: 13, fontSize: 13.5, fontWeight: 600, color: '#3A3A38', cursor: 'pointer' }}>
                    Cancel
                  </div>
                  <div onClick={handleSubmit} style={{ flex: 1, textAlign: 'center', background: '#3A3A38', color: '#f3ecdc', fontWeight: 600, fontSize: 13.5, padding: 13, borderRadius: 100, cursor: 'pointer' }}>
                    {saving ? 'Sending…' : 'Send report'}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#3A3A38' }}>Thanks — got it! 🙏</div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}