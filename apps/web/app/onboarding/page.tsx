'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

type Level = 'beginner' | 'intermediate' | 'advanced'

const LEVEL_INFO: Record<Level, { label: string; desc: string }> = {
  beginner: { label: 'Casual Reader', desc: 'You read for the story. Quick, simple check-ins will help the details stick without slowing you down.' },
  intermediate: { label: 'Engaged Reader', desc: "You notice how a book makes you feel, not just what happens in it. We'll mix a little recall with a little reflection." },
  advanced: { label: 'Deep Reader', desc: 'A book stays with you after you close it. Expect open, unhurried questions about meaning, feeling, and connection.' },
}

const QUESTIONS: { prompt: string; options: { label: string; level: Level }[] }[] = [
  {
    prompt: "When you finish a chapter, you'd rather…",
    options: [
      { label: 'Answer a couple of quick recall questions', level: 'beginner' },
      { label: 'A mix of quick questions and a little reflection', level: 'intermediate' },
      { label: 'Sit with some open, honest thoughts', level: 'advanced' },
    ],
  },
  {
    prompt: 'After you close a book, its themes tend to…',
    options: [
      { label: 'Fade quickly — I mostly want to remember the plot', level: 'beginner' },
      { label: 'Come up now and then, when something really lands', level: 'intermediate' },
      { label: 'Stay with me for days', level: 'advanced' },
    ],
  },
  {
    prompt: 'How do you usually read?',
    options: [
      { label: 'A chapter here and there, whenever I can', level: 'beginner' },
      { label: 'Depends on the week', level: 'intermediate' },
      { label: 'Long stretches, several chapters at once', level: 'advanced' },
    ],
  },
  {
    prompt: 'Journaling about what you read is…',
    options: [
      { label: 'New to me', level: 'beginner' },
      { label: "Something I've dabbled in", level: 'intermediate' },
      { label: 'Already part of how I read', level: 'advanced' },
    ],
  },
]

function calculateLevel(answers: Level[]): Level {
  const counts: Record<string, number> = {}
  answers.forEach((l) => { counts[l] = (counts[l] || 0) + 1 })
  let max = 0
  let top: Level[] = []
  ;(Object.keys(counts) as Level[]).forEach((k) => {
    if (counts[k] > max) { max = counts[k]; top = [k] }
    else if (counts[k] === max) { top.push(k) }
  })
  if (top.length > 1 && top.includes('intermediate')) return 'intermediate'
  return top[0]
}

function OnboardingContent() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1) // 1-4 = questions, 5 = result
  const [answers, setAnswers] = useState<Level[]>([])
  const [resultLevel, setResultLevel] = useState<Level>('beginner')
  const [saving, setSaving] = useState(false)

  const currentQ = step >= 1 && step <= 4 ? QUESTIONS[step - 1] : null

  const pickAnswer = (level: Level) => {
    const next = [...answers, level]
    setAnswers(next)
    if (next.length >= 4) {
      setResultLevel(calculateLevel(next))
      setStep(5)
    } else {
      setStep(step + 1)
    }
  }

  const finishOnboarding = async () => {
    setSaving(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      console.error('No user found when finishing onboarding')
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ reading_level: resultLevel, onboarded: true })
      .eq('id', userData.user.id)
      .select()

    if (updateError) {
      console.error('Update failed:', updateError)
      setSaving(false)
      return
    }

    router.push('/home')
    router.refresh()
  }

  const article = /^[AEIOU]/i.test(LEVEL_INFO[resultLevel].label) ? 'an' : 'a'

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {step === 0 && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <img src="/images/logo.png" alt="Afterwords logo" style={{ width: 96, height: 96, objectFit: 'contain' }} />
            <div style={{ fontFamily: 'Spectral, serif', fontSize: 16, color: '#6B8F76' }}>a quiet place to remember</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 46, fontWeight: 500, color: '#3A3A38' }}>Afterwords</div>
            <video
  src="/videos/welcome-illustration.mp4"
  autoPlay
  muted
  playsInline
  style={{ width: 220, maxWidth: '100%', borderRadius: 14, marginTop: 6 }}
/>
            <div style={{ fontSize: 15, lineHeight: 1.6, color: '#5c5642', maxWidth: 280 }}>
              A journal for what stays with you after you close the book.
            </div>
            <button
              onClick={() => setStep(1)}
              style={{ marginTop: 14, background: '#3A3A38', color: '#f3ecdc', fontWeight: 600, fontSize: 15, padding: '15px 40px', borderRadius: 100, border: 'none', cursor: 'pointer' }}
            >
              Get started
            </button>
          </div>
        )}

{currentQ && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <img src={`/images/onboarding-icon-${step}.png`} alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} />
            </div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: '#3A3A38', marginBottom: 28, lineHeight: 1.4, textAlign: 'center' }}>
              {currentQ.prompt}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {currentQ.options.map((opt) => (
                <div
                  key={opt.label}
                  onClick={() => pickAnswer(opt.level)}
                  style={{ background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 14, padding: '18px 20px', fontSize: 15, lineHeight: 1.5, color: '#3f3b2e', cursor: 'pointer', textAlign: 'center' }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i === step - 1 ? '#3A3A38' : 'rgba(51,50,74,0.2)' }} />
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <img src={`/images/badge-${resultLevel === 'beginner' ? 'casual' : resultLevel === 'intermediate' ? 'engaged' : 'deep'}.png`} alt="" style={{ width: 96, height: 96, objectFit: 'contain' }} />
            <div style={{ fontFamily: 'Spectral, serif', fontSize: 16, color: '#6B8F76' }}>your reading style</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 500, color: '#3A3A38' }}>
              You&apos;re {article} {LEVEL_INFO[resultLevel].label}
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.65, color: '#5c5642', maxWidth: 280 }}>
              {LEVEL_INFO[resultLevel].desc}
            </div>
            <button
              onClick={finishOnboarding}
              disabled={saving}
              style={{ marginTop: 18, background: '#3A3A38', color: '#f3ecdc', fontWeight: 600, fontSize: 15, padding: '15px 40px', borderRadius: 100, border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving…' : 'Enter Afterwords'}
            </button>
            <div style={{ fontSize: 12, color: '#8A8880', marginTop: 2 }}>You can change this anytime in Settings.</div>
          </div>
        )}

      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return <OnboardingContent />
}