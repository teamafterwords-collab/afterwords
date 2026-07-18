'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PaywallPage() {
  const router = useRouter()
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  const price = billing === 'monthly' ? '$4.99/month' : '$3.99/month'
  const priceSubtext = billing === 'monthly' ? 'billed monthly' : 'billed annually at $47.88'

  const handleSubscribe = () => {
    alert('Welcome to Afterwords Plus! (placeholder — real billing comes later)')
    router.push('/home')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 560, width: '100%', margin: '0 auto', padding: '60px 22px 40px', position: 'relative' }}>
        <div onClick={() => router.push('/home')} style={{ position: 'absolute', top: 24, right: 22, fontSize: 20, color: '#8A8880', cursor: 'pointer' }}>✕</div>

        <div style={{ textAlign: 'center', fontFamily: 'Spectral, serif', fontSize: 16, color: '#6B8F76', marginBottom: 14 }}>
          a little further, together
        </div>
        <div style={{ textAlign: 'center', fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 500, color: '#3A3A38', marginBottom: 28, lineHeight: 1.3 }}>
          You&apos;ve reflected on 5 chapters — subscribe to keep the habit going
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 26 }}>
          {[
            'Unlimited books on your shelf',
            'Deeper, more personal reflection questions',
            'Unlimited question skips',
            'Cross-book Memories & connections',
            'Full journal export',
          ].map((f) => (
            <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ color: '#6B8F76', fontSize: 14 }}>✓</div>
              <div style={{ fontSize: 14.5, color: '#3f3b2e' }}>{f}</div>
            </div>
          ))}
        </div>

        <div style={{ position: 'relative', display: 'flex', background: '#F3F1EC', borderRadius: 100, padding: 4, marginBottom: 24 }}>
          <div
            onClick={() => setBilling('monthly')}
            style={{
              flex: 1, textAlign: 'center', padding: '12px', borderRadius: 100, cursor: 'pointer', fontWeight: 600, fontSize: 14,
              background: billing === 'monthly' ? '#3A3A38' : 'transparent',
              color: billing === 'monthly' ? '#f3ecdc' : '#3f3b2e',
            }}
          >
            Monthly
          </div>
          <div
            onClick={() => setBilling('annual')}
            style={{
              flex: 1, textAlign: 'center', padding: '12px', borderRadius: 100, cursor: 'pointer', fontWeight: 600, fontSize: 14, position: 'relative',
              background: billing === 'annual' ? '#3A3A38' : 'transparent',
              color: billing === 'annual' ? '#f3ecdc' : '#3f3b2e',
            }}
          >
            Annual
            <div style={{ position: 'absolute', top: -10, right: -6, background: '#6B8F76', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
              Save 33%
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 500, color: '#3A3A38' }}>{price}</div>
          <div style={{ fontSize: 13, color: '#8A8880', marginTop: 4 }}>{priceSubtext}</div>
        </div>

        <button
          onClick={handleSubscribe}
          style={{ width: '100%', background: '#3A3A38', color: '#f3ecdc', fontWeight: 600, fontSize: 15, padding: 16, borderRadius: 100, border: 'none', cursor: 'pointer', marginBottom: 18 }}
        >
          Subscribe to Afterwords Plus
        </button>

        <div style={{ textAlign: 'center', fontSize: 13, color: '#8A8880', cursor: 'pointer' }}>
          Restore purchases
        </div>
      </div>
    </div>
  )
}