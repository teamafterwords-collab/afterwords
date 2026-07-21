'use client'

import { useRouter } from 'next/navigation'

export default function PricingPage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 480, width: '100%', margin: '0 auto', padding: '60px 24px 60px', boxSizing: 'border-box' }}>
        <div onClick={() => router.back()} style={{ fontSize: 14, color: '#8A8880', cursor: 'pointer', marginBottom: 20 }}>← Back</div>

        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 500, color: '#3A3A38', marginBottom: 8, textAlign: 'center' }}>Pricing</div>
        <div style={{ fontSize: 14, color: '#8A8880', marginBottom: 32, textAlign: 'center' }}>Simple, transparent pricing.</div>

        <div style={{ background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, color: '#3A3A38', marginBottom: 4 }}>Free</div>
          <div style={{ fontSize: 13, color: '#8A8880', marginBottom: 16 }}>Get started at no cost</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13.5, color: '#4a4636', lineHeight: 1.9 }}>
            <li>✓ Up to 5 check-ins</li>
            <li>✓ Basic reflection questions</li>
            <li>✓ Journal for your current reads</li>
          </ul>
        </div>

        <div style={{ background: '#3A3A38', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, color: '#FAF9F6', marginBottom: 4 }}>Afterwords Plus</div>
          <div style={{ fontSize: 13, color: '#B8C4B8', marginBottom: 16 }}>Unlimited reflection, unlimited skips</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13.5, color: '#F3F1EC', lineHeight: 1.9, marginBottom: 20 }}>
            <li>✓ Unlimited books on your shelf</li>
            <li>✓ Deeper, more personal reflection questions</li>
            <li>✓ Unlimited question skips</li>
            <li>✓ Cross-book Memories & connections</li>
            <li>✓ Full journal export</li>
          </ul>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <div style={{ fontSize: 13, color: '#B8C4B8' }}>Monthly</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: '#FAF9F6' }}>$4.99<span style={{ fontSize: 12, fontWeight: 400, color: '#B8C4B8' }}> / month</span></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 13, color: '#B8C4B8' }}>Annual <span style={{ color: '#6B8F76' }}>(save 33%)</span></div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: '#FAF9F6' }}>$47.88<span style={{ fontSize: 12, fontWeight: 400, color: '#B8C4B8' }}> / year</span></div>
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: '#8A8880', lineHeight: 1.6, textAlign: 'center' }}>
          Taxes may apply and will be calculated at checkout. Prices shown in USD. You can cancel your subscription anytime.
        </div>
      </div>
    </div>
  )
}