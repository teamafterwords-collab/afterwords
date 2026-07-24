'use client'

import { useRouter } from 'next/navigation'

export default function WelcomePage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 480, width: '100%', margin: '0 auto', padding: '60px 24px 50px', boxSizing: 'border-box' }}>

        {/* Logo + tagline */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src="/images/logo.png" alt="Afterwords" style={{ width: 200, maxWidth: '100%', objectFit: 'contain', marginBottom: 22 }} />
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 21, fontWeight: 500, color: '#3A3A38', lineHeight: 1.4, marginBottom: 10 }}>
            Books change you.<br />Only if you remember them.
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: '#5c5642', maxWidth: 320, margin: '0 auto' }}>
            A quiet place to capture the ideas, questions, and moments that stay with you long after you close the book.
          </div>
        </div>

        {/* Example memory card */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ height: 1, background: 'rgba(58,58,56,0.15)', marginBottom: 20 }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 18, lineHeight: 1.55, color: '#3A3A38', marginBottom: 14 }}>
              &quot;I finally understood why I keep trying to keep all my options open.&quot;
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#6B8F76', marginBottom: 4 }}>— Four Thousand Weeks</div>
            <div style={{ fontSize: 11.5, color: '#8A8880' }}>Saved 8 months ago</div>
          </div>
          <div style={{ height: 1, background: 'rgba(58,58,56,0.15)', marginTop: 20 }} />
        </div>

        {/* Benefit bullets */}
        <div style={{ marginBottom: 36 }}>
          {[
            'Remember more than the plot',
            'Capture what changed your thinking',
            'See your books connect over time',
          ].map((benefit) => (
            <div key={benefit} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
              <div style={{ color: '#6B8F76', fontSize: 14, marginTop: 1 }}>•</div>
              <div style={{ fontSize: 14.5, color: '#3A3A38', lineHeight: 1.4 }}>{benefit}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push('/login')}
          style={{ width: '100%', background: '#3A3A38', color: '#FAF9F6', fontWeight: 600, fontSize: 15, padding: '15px', borderRadius: 100, border: 'none', cursor: 'pointer', marginBottom: 24 }}
        >
          Start my reading journal
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', fontSize: 12, color: '#8A8880' }}>
          <a href="/pricing" style={{ color: '#8A8880', textDecoration: 'none' }}>Pricing</a>
          <a href="/terms" style={{ color: '#8A8880', textDecoration: 'none' }}>Terms</a>
          <a href="/privacy" style={{ color: '#8A8880', textDecoration: 'none' }}>Privacy</a>
          <a href="/refunds" style={{ color: '#8A8880', textDecoration: 'none' }}>Refunds</a>
          <a href="/contact" style={{ color: '#8A8880', textDecoration: 'none' }}>Contact</a>
        </div>

      </div>
    </div>
  )
}
