'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { getProfile, checkWeeklyLimit, submitContactMessage, type Profile, type TierLimit } from '@/utils/supabase/queries'
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
  const [tierInfo, setTierInfo] = useState<TierLimit | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [subscription, setSubscription] = useState<{
    status: string
    plan: string | null
    current_period_end: string | null
  } | null>(null)
  const [contactOpen, setContactOpen] = useState(false)
  const [contactMessage, setContactMessage] = useState('')
  const [contactSending, setContactSending] = useState(false)
  const [contactSent, setContactSent] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [p, tier] = await Promise.all([getProfile(), checkWeeklyLimit()])
      setProfile(p)
      setTierInfo(tier)

      const { data: userData } = await supabase.auth.getUser()
      setEmail(userData.user?.email ?? null)
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('status, plan, current_period_end')
        .eq('user_id', userData.user?.id)
        .maybeSingle()

      setSubscription(subscriptionData)

      setLoading(false)
    }
    load()
  }, [])

  

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleManageSubscription = async () => {
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) return

    const response = await fetch('/api/paddle/customer-portal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userData.user.id,
      }),
    })

    const data = await response.json()

    if (data.url) {
      window.location.href = data.url
    } else {
      alert('Unable to open subscription portal.')
    }
  }

  const handleContactSubmit = async () => {
    if (!contactMessage.trim()) return
    setContactSending(true)
    await submitContactMessage(contactMessage)
    setContactSending(false)
    setContactSent(true)
    setTimeout(() => {
      setContactOpen(false)
      setContactSent(false)
      setContactMessage('')
    }, 1500)
  }

  if (loading || !profile) {
    return <div style={{ minHeight: '100vh', background: '#FAF9F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>
  }

  const isSubscribed = subscription?.status === 'active'

  const renewalDate =
    subscription?.current_period_end
      ? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : '—'

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', fontFamily: 'Inter, sans-serif' }}>
      <div className="aw-container" style={{ width: '100%', margin: '0 auto', padding: '60px 22px 100px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24, marginTop: 4 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 500, color: '#3A3A38' }}>Settings</div>
            {email && (
              <div style={{ fontSize: 13, color: '#8A8880', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {email}
              </div>
            )}
          </div>
          <div
            onClick={handleLogout}
            style={{
              background: '#B85C4A',
              color: '#FAF9F6',
              fontSize: 13,
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: 100,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Log out
          </div>
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: '#3A3A38', marginBottom: 4 }}>Subscription</div>
        <div style={{ background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 14, padding: 16, marginBottom: 26 }}>
          {tierInfo?.plan === 'beta' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: '#b8935a', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100, letterSpacing: '0.02em' }}>
                BETA TESTER
              </div>
              <div style={{ fontSize: 12.5, color: '#5c5642' }}>Unlimited access — thank you for testing!</div>
            </div>
          ) : tierInfo?.onTrial ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ background: '#6B8F76', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100, letterSpacing: '0.02em' }}>
                  FREE TRIAL
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 12.5, color: '#5c5642', lineHeight: 1.5, flex: 1, minWidth: 0 }}>
                  Unlimited check-ins during your 30-day trial. After that, you&apos;ll move to 1 free check-in per week unless you upgrade.
                </div>
                <button
                  onClick={() => router.push('/paywall')}
                  style={{ flexShrink: 0, background: '#3A3A38', color: '#f3ecdc', fontWeight: 600, fontSize: 13, padding: '10px 20px', borderRadius: 100, border: 'none', cursor: 'pointer' }}
                >
                  Upgrade to Plus
                </button>
              </div>
            </div>
          ) : isSubscribed || tierInfo?.plan === 'plus' ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#3A3A38', marginBottom: 4 }}>Afterwords Plus</div>
              <div style={{ fontSize: 12.5, color: '#8A8880', marginBottom: 14 }}>
                Unlimited check-ins{renewalDate !== '—' ? ` · Renews on ${renewalDate}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div onClick={handleManageSubscription} style={{ fontSize: 12.5, fontWeight: 600, color: '#3A3A38', cursor: 'pointer' }}>Manage subscription</div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#3A3A38', marginBottom: 4 }}>Free plan</div>
                <div style={{ fontSize: 12.5, color: '#8A8880' }}>
                  {tierInfo?.used ?? 0} of 1 check-in used this week
                </div>
              </div>
              <button
                onClick={() => router.push('/paywall')}
                style={{ flexShrink: 0, background: '#3A3A38', color: '#f3ecdc', fontWeight: 600, fontSize: 13, padding: '10px 20px', borderRadius: 100, border: 'none', cursor: 'pointer' }}
              >
                Upgrade to Plus
              </button>
            </div>
          )}
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: '#3A3A38', marginBottom: 4 }}>Reading level</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: '#8A8880', marginBottom: 14 }}>
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
                  display: 'flex', gap: 12, alignItems: 'flex-start', background: '#F3F1EC',
                  border: `1.5px solid ${sel ? '#3A3A38' : 'rgba(58,58,56,0.08)'}`, borderRadius: 14, padding: '14px 16px',
                  opacity: sel ? 1 : 0.55,
                }}
              >
                <img src={`/images/badge-${badgeName}.png`} alt="" style={{ width: 34, height: 34, objectFit: 'contain', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#3A3A38' }}>{LEVEL_INFO[level].label}</div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: '#5c5642', marginTop: 2 }}>{LEVEL_INFO[level].desc}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div
          onClick={() => router.push('/onboarding?retake=true')}
          style={{ display: 'inline-block', textAlign: 'center', border: '1.5px solid rgba(51,50,74,0.2)', borderRadius: 100, padding: '13px 28px', fontSize: 13.5, fontWeight: 600, color: '#3A3A38', cursor: 'pointer' }}
        >
          Retake the self-assessment
        </div>

        <div style={{ height: 1, background: 'rgba(58,58,56,0.1)', margin: '28px 0' }} />

        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#3A3A38', marginBottom: 4 }}>Contact us</div>

          {!contactOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ fontSize: 12, lineHeight: 1.4, color: '#8A8880', flex: 1, minWidth: 0 }}>
                Questions, feedback, or something not working? We&apos;d love to hear from you.
              </div>
              <div
                onClick={() => setContactOpen(true)}
                style={{ display: 'inline-block', textAlign: 'center', border: '1.5px solid rgba(58,58,56,0.2)', borderRadius: 100, padding: '13px 28px', fontSize: 13.5, fontWeight: 600, color: '#3A3A38', cursor: 'pointer', flexShrink: 0 }}
              >
                Send a message
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, lineHeight: 1.4, color: '#8A8880', marginBottom: 12 }}>
                Questions, feedback, or something not working? We&apos;d love to hear from you.
              </div>
              <div style={{ background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 14, padding: 16 }}>
                {!contactSent ? (
                  <>
                    <textarea
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="What's on your mind?"
                      autoFocus
                      style={{ width: '100%', minHeight: 100, background: '#FAF9F6', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 10, padding: 12, fontSize: 14, lineHeight: 1.5, color: '#3A3A38', resize: 'vertical', marginBottom: 12, boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div onClick={() => { setContactOpen(false); setContactMessage('') }} style={{ flex: 1, textAlign: 'center', border: '1.5px solid rgba(58,58,56,0.2)', borderRadius: 100, padding: 10, fontSize: 13, fontWeight: 600, color: '#3A3A38', cursor: 'pointer' }}>
                        Cancel
                      </div>
                      <div onClick={handleContactSubmit} style={{ flex: 1, textAlign: 'center', background: '#3A3A38', color: '#FAF9F6', fontWeight: 600, fontSize: 13, padding: 10, borderRadius: 100, cursor: 'pointer' }}>
                        {contactSending ? 'Sending…' : 'Send'}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#3A3A38' }}>Thanks — we&apos;ll get back to you 🙏</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', fontSize: 12, color: '#8A8880' }}>Afterwords · your reading companion</div>
      </div>

      <BottomNav />
    </div>
  )
}