'use client'

import { usePathname, useRouter } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const tabs = [
    { label: 'Home', path: '/home' },
    { label: 'Journal', path: '/journal' },
    { label: 'Connections', path: '/connections' },
    { label: 'Settings', path: '/settings' },
  ]

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      display: 'flex', justifyContent: 'center',
      borderTop: '1px solid rgba(58,58,56,0.08)', background: '#FAF9F6',
    }}>
      <div style={{
        display: 'flex', width: '100%', maxWidth: 560,
        padding: '12px 22px 20px', boxSizing: 'border-box',
      }}>
        {tabs.map((tab) => {
          const active = pathname === tab.path
          return (
            <div key={tab.path} onClick={() => router.push(tab.path)} style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 600, color: active ? '#3A3A38' : '#a39d87' }}>
                {tab.label}
              </div>
              {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#6B8F76', margin: '5px auto 0' }} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
