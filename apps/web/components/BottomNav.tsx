'use client'

import { usePathname, useRouter } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const tabs = [
    { label: 'Home', path: '/home' },
    { label: 'Journal', path: '/journal' },
    { label: 'Settings', path: '/settings' },
  ]

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      display: 'flex', borderTop: '1px solid rgba(51,50,74,0.12)', background: '#efe6d3',
      padding: '12px 10px 20px',
    }}>
      {tabs.map((tab) => {
        const active = pathname === tab.path
        return (
          <div key={tab.path} onClick={() => router.push(tab.path)} style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontFamily: 'Lora, serif', fontSize: 13, fontWeight: 600, color: active ? '#33324a' : '#a39d87' }}>
              {tab.label}
            </div>
            {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#b8935a', margin: '5px auto 0' }} />}
          </div>
        )
      })}
    </div>
  )
}