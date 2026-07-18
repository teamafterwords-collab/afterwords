'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBooks, getEntriesForUser, findAllConnections, type Book } from '@/utils/supabase/queries'
import BottomNav from '@/components/BottomNav'

type ConnectionResult = { bookId: string; bookTitle: string; connection: { bookTitle: string; theme: string; category: string; note: string } }

const CATEGORY_ORDER = ['Identity & Self', 'Loss & Grief', 'Love & Connection', 'Fear & Courage', 'Meaning & Purpose', 'Change & Growth', 'Memory & Time', 'Other']

export default function ConnectionsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [connections, setConnections] = useState<ConnectionResult[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [notEnoughData, setNotEnoughData] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [b, e] = await Promise.all([getBooks(), getEntriesForUser()])
      setBooks(b)

      const booksWithEntries = new Set(e.map((entry) => entry.book_id))
      if (booksWithEntries.size < 2) {
        setNotEnoughData(true)
        setLoading(false)
        return
      }

      const results = await findAllConnections(b, e)
      setConnections(results)
      setLoading(false)
    }
    load()
  }, [])

  const availableCategories = CATEGORY_ORDER.filter((cat) => connections.some((c) => c.connection.category === cat))
  const filteredConnections = activeCategory ? connections.filter((c) => c.connection.category === activeCategory) : connections

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 560, width: '100%', margin: '0 auto', padding: '60px 22px 110px', boxSizing: 'border-box' }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 500, color: '#3A3A38', marginBottom: 6, marginTop: 4 }}>Connections</div>
        <div style={{ fontSize: 13, color: '#8A8880', marginBottom: 20 }}>How your books talk to each other.</div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 10px' }}>
            <div style={{ fontFamily: 'Spectral, serif', fontSize: 16, color: '#6B8F76' }}>looking for threads between your books…</div>
          </div>
        )}

        {!loading && notEnoughData && (
          <div style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, color: '#3A3A38' }}>Not quite yet.</div>
            <div style={{ fontSize: 13.5, color: '#5c5642', maxWidth: 260, lineHeight: 1.5 }}>
              Journal across at least two books, and we&apos;ll start finding connections between them.
            </div>
          </div>
        )}

        {!loading && !notEnoughData && connections.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 13.5, color: '#8A8880' }}>No connections found yet — keep journaling and check back.</div>
          </div>
        )}

        {!loading && availableCategories.length > 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 2 }}>
            <div
              onClick={() => setActiveCategory(null)}
              style={{
                flex: '0 0 auto', padding: '8px 16px', borderRadius: 100, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
                background: activeCategory === null ? '#3A3A38' : '#F3F1EC',
                color: activeCategory === null ? '#f3ecdc' : '#5c5642',
                border: '1px solid rgba(58,58,56,0.08)',
              }}
            >
              All
            </div>
            {availableCategories.map((cat) => (
              <div
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                style={{
                  flex: '0 0 auto', padding: '8px 16px', borderRadius: 100, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
                  background: activeCategory === cat ? '#3A3A38' : '#F3F1EC',
                  color: activeCategory === cat ? '#f3ecdc' : '#5c5642',
                  border: '1px solid rgba(58,58,56,0.08)',
                }}
              >
                {cat}
              </div>
            ))}
          </div>
        )}

        {!loading && filteredConnections.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filteredConnections.map((c) => {
              const book = books.find((b) => b.id === c.bookId)
              return (
                <div
                  key={c.bookId}
                  onClick={() => router.push(`/journal?book=${c.bookId}`)}
                  style={{ background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 14, padding: 18, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 26, height: 34, borderRadius: 3, backgroundColor: book?.cover_color ?? '#3b3a5c', backgroundImage: book?.cover_url ? `url(${book.cover_url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#3A3A38' }}>{c.bookTitle}</div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#6B8F76', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{c.connection.category}</div>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 400, color: '#6B8F76', marginBottom: 8 }}>
                    connects to <span style={{ fontWeight: 700 }}>{c.connection.bookTitle}</span> · {c.connection.theme}
                  </div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#5c5642' }}>{c.connection.note}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}