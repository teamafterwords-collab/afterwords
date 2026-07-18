'use client'

import { useRouter } from 'next/navigation'

export default function WelcomePage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
        <img src="/images/logo.png" alt="Afterwords logo" style={{ width: 260, maxWidth: '100%', objectFit: 'contain' }} />
        <div style={{ fontSize: 15, lineHeight: 1.6, color: '#5c5642', maxWidth: 280 }}>
          A journal for what stays with you after you close the book.
        </div>
        <video
  src="/videos/welcome-illustration.mp4"
  autoPlay
  muted
  playsInline
  style={{ width: 220, maxWidth: '100%', borderRadius: 14, marginTop: 6 }}
/>
        <button
          onClick={() => router.push('/login')}
          style={{ marginTop: 14, background: '#3A3A38', color: '#f3ecdc', fontWeight: 600, fontSize: 15, padding: '15px 40px', borderRadius: 100, border: 'none', cursor: 'pointer' }}
        >
          Get started
        </button>
      </div>
    </div>
  )
}
