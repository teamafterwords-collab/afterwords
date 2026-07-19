'use client'

import { useRouter } from 'next/navigation'

export default function WelcomePage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 480, width: '100%', margin: '0 auto', padding: '60px 24px 40px', boxSizing: 'border-box' }}>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img src="/images/logo-wordmark.png" alt="Afterwords" style={{ display: 'block', width: 220, maxWidth: '100%', objectFit: 'contain', margin: '0 auto' }} />
          <div style={{ fontSize: 15, lineHeight: 1.6, color: '#5c5642', maxWidth: 300, margin: '-8px auto 0' }}>
            A journal for what stays with you after you close the book.
          </div>
        </div>

        <div style={{ background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 16, padding: 22, marginBottom: 16 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 600, color: '#3A3A38', marginBottom: 8 }}>You forget most of what you read</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.65, color: '#4a4636' }}>
            Research on the &quot;testing effect&quot; shows that actively recalling what you&apos;ve read — not just re-reading it — is one of the most effective ways to actually retain it.
          </div>
        </div>

        <div style={{ background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 16, padding: 22, marginBottom: 16 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 600, color: '#3A3A38', marginBottom: 8 }}>A few questions, right after you read</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.65, color: '#4a4636' }}>
            After each chapter, we ask a couple of short questions — matched to how deeply you like to read — so the ideas actually stick.
          </div>
        </div>

        <div style={{ background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 16, padding: 22, marginBottom: 30 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 600, color: '#3A3A38', marginBottom: 8 }}>No streaks. No pressure. Come back when you want.</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.65, color: '#4a4636' }}>
            We won&apos;t notify you to keep a streak alive. Your journal — and the option to revisit any finished book — is simply there whenever you&apos;re ready.
          </div>
        </div>

        <button
          onClick={() => router.push('/login')}
          style={{ width: '100%', background: '#3A3A38', color: '#FAF9F6', fontWeight: 600, fontSize: 15, padding: '15px', borderRadius: 100, border: 'none', cursor: 'pointer', marginBottom: 24 }}
        >
          Get started
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', fontSize: 12, color: '#8A8880' }}>
          <a href="/terms" style={{ color: '#8A8880', textDecoration: 'none' }}>Terms</a>
          <a href="/privacy" style={{ color: '#8A8880', textDecoration: 'none' }}>Privacy</a>
          <a href="/refunds" style={{ color: '#8A8880', textDecoration: 'none' }}>Refunds</a>
          <a href="/contact" style={{ color: '#8A8880', textDecoration: 'none' }}>Contact</a>
        </div>

      </div>
    </div>
  )
}