'use client'

import { useRouter } from 'next/navigation'

export default function RefundsPage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 640, width: '100%', margin: '0 auto', padding: '60px 22px 80px', boxSizing: 'border-box' }}>
        <div onClick={() => router.back()} style={{ fontSize: 14, color: '#8A8880', cursor: 'pointer', marginBottom: 20 }}>← Back</div>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 500, color: '#3A3A38', marginBottom: 8 }}>Refund Policy</div>
          <div style={{ fontSize: 13, color: '#8A8880', marginBottom: 32 }}>Last updated: July 18, 2026</div>
  
          <Section title="1. Subscription Cancellation">
            You may cancel your Afterwords Plus subscription at any time from the Settings page or through your Paddle receipt. Cancelling stops future renewals; you will retain access to Plus features until the end of your current billing period.
          </Section>
  
          <Section title="2. Refunds">
            If you are unsatisfied with your purchase, you may request a refund within 14 days of your original purchase or renewal date by contacting us at teamafterwords@gmail.com. Refund requests are reviewed on a case-by-case basis.
          </Section>
  
          <Section title="3. Payment Processing">
            All payments are processed by Paddle.com, our payment provider and merchant of record. Refunds are issued to your original payment method and may take 5-10 business days to appear, depending on your bank or card issuer.
          </Section>
  
          <Section title="4. Non-Refundable Circumstances">
            We generally do not offer refunds for partial subscription periods, or for accounts terminated due to violation of our Terms of Service.
          </Section>
  
          <Section title="5. Contact">
            For refund requests or billing questions, contact us at teamafterwords@gmail.com.
          </Section>
        </div>
      </div>
    )
  }
  
  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 600, color: '#3A3A38', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: '#4a4636' }}>{children}</div>
      </div>
    )
  }