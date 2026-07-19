'use client'

import { useRouter } from 'next/navigation'

export default function ContactPage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 480, width: '100%', padding: '60px 22px', boxSizing: 'border-box' }}>
        <div onClick={() => router.back()} style={{ fontSize: 14, color: '#8A8880', cursor: 'pointer', marginBottom: 20 }}>← Back</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 500, color: '#3A3A38', marginBottom: 12 }}>Get in touch</div>
          <div style={{ fontSize: 14, lineHeight: 1.7, color: '#4a4636', marginBottom: 20 }}>
            Questions, feedback, or something not working right? We&apos;d love to hear from you.
          </div>
          <a href="mailto:teamafterwords@gmail.com" style={{ fontSize: 15, fontWeight: 600, color: '#6B8F76', textDecoration: 'none' }}>
            teamafterwords@gmail.com
          </a>
        </div>
      </div>
    </div>
  )
}
