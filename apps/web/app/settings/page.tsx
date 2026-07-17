'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { getProfile, getCheckinCount, type Profile } from '@/utils/supabase/queries'
import BottomNav from '@/components/BottomNav'

const LEVEL_INFO: Record<string, { label: string; desc: string }> = {
  beginner: { label: 'Casual Reader', desc: 'You read for the story. Quick, simple check-ins will help the details stick without slowing you down.' },
  intermediate: { label: 'Engaged Reader', desc: "You notice how a book makes you feel, not just what happens in it. We'll mix a little recall with a little reflection." },
  advanced: { label: 'Deep Reader', desc: 'A book stays with you after you close it. Expect open, unhurried questions about meaning, feeling, and connection.' },
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [checkinCount, setCheckinCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const [p, count] = await Promise.all([getProfile(), getCheckinCount()])
      setProfile(p)
      setCheckinCount(count)
      setLoading(false)
    }
    load()
  }, [])

  

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading || !profile) {
    return <div style={{ minHeight: '100vh', background: '#efe6d3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>
  }

  const isSubscribed = false

  return (
    <div style={{ minHeight: '100vh', background: '#efe6d3', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '60px 22px 100px' }}>
        <div style={{ fontFamily: 'Lora, serif', fontSize: 24, fontWeight: 700, color: '#33324a', marginBottom: 24, marginTop: 4 }}>Settings</div>

        <div style={{ fontSize: 13, fontWeight: 600, color: '#33324a', marginBottom: 4 }}>Subscription</div>
        <div style={{ background: '#fbf6ec', border: '1px solid rgba(51,50,74,0.1)', borderRadius: 14, padding: 16, marginBottom: 26 }}>
          {profile.is_beta_tester ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: '#b8935a', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100, letterSpacing: '0.02em' }}>
                BETA TESTER
              </div>
              <div style={{ fontSize: 12.5, color: '#5c5642' }}>Unlimited access — thank you for testing!</div>
            </div>
          ) : isSubscribed ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#33324a', marginBottom: 4 }}>Afterwords Plus · Monthly</div>
              <div style={{ fontSize: 12.5, color: '#8d8570', marginBottom: 14 }}>Renews on —</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#33324a', cursor: 'pointer' }}>Manage subscription</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#8d8570', cursor: 'pointer' }}>Restore purchases</div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#33324a', marginBottom: 4 }}>Free plan</div>
                <div style={{ fontSize: 12.5, color: '#8d8570' }}>
                  {Math.min(checkinCount, 5)} of 5 check-ins used — unlock more with Plus
                </div>
              </div>
              <button
                onClick={() => router.push('/paywall')}
                style={{ flexShrink: 0, background: '#33324a', color: '#f3ecdc', fontWeight: 600, fontSize: 13, padding: '10px 20px', borderRadius: 100, border: 'none', cursor: 'pointer' }}
              >
                Upgrade to Plus
              </button>
            </div>
          )}
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: '#33324a', marginBottom: 4 }}>Reading level</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: '#8d8570', marginBottom: 14 }}>
          This shapes the kind of questions we ask after each chapter.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 30 }}>
          {(['beginner', 'intermediate', 'advanced'] as const).map((level) => {
            const sel = profile.reading_level === level
            const badgeName = level === 'beginner' ? 'casual' : level === 'intermediate' ? 'engaged' : 'deep'
            return (
              <div
                key={level}
                style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start', background: '#fbf6ec',
                  border: `1.5px solid ${sel ? '#33324a' : 'rgba(51,50,74,0.12)'}`, borderRadius: 14, padding: '14px 16px',
                  opacity: sel ? 1 : 0.55,
                }}
              >
                <img src={`/images/badge-${badgeName}.png`} alt="" style={{ width: 34, height: 34, objectFit: 'contain', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#33324a' }}>{LEVEL_INFO[level].label}</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: '#5c5642', marginTop: 2 }}>{LEVEL_INFO[level].desc}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div
          onClick={() => router.push('/onboarding?retake=true')}
          style={{ textAlign: 'center', border: '1.5px solid rgba(51,50,74,0.2)', borderRadius: 100, padding: 13, fontSize: 13.5, fontWeight: 600, color: '#33324a', cursor: 'pointer', marginBottom: 12 }}
        >
          Retake the self-assessment
        </div>

        <div
          onClick={handleLogout}
          style={{ textAlign: 'center', border: '1.5px solid rgba(51,50,74,0.2)', borderRadius: 100, padding: 13, fontSize: 13.5, fontWeight: 600, color: '#33324a', cursor: 'pointer', marginBottom: 24 }}
        >
          Log out
        </div>

        <div style={{ textAlign: 'center', fontSize: 12, color: '#8d8570' }}>Afterwords · your reading companion</div>
      </div>

      <BottomNav />
    </div>
  )
}