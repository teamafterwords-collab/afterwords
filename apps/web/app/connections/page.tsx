'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBooks, getEntriesForUser, findAllConnections, type Book } from '@/utils/supabase/queries'
import BottomNav from '@/components/BottomNav'
import ResponsiveStyles from '@/components/ResponsiveStyles'

type ConnectionResult = { bookId: string; bookTitle: string; connection: { bookTitle: string; theme: string; category: string; note: string } }

const CATEGORY_ORDER = ['Identity & Self', 'Loss & Grief', 'Love & Connection', 'Fear & Courage', 'Meaning & Purpose', 'Change & Growth', 'Memory & Time', 'Other']
const CATEGORY_COLORS: Record<string, string> = {
  'Identity & Self': '#6B8F76',
  'Loss & Grief': '#8A7A9B',
  'Love & Connection': '#C97B6B',
  'Fear & Courage': '#B8935A',
  'Meaning & Purpose': '#5B84A6',
  'Change & Growth': '#7BA05B',
  'Memory & Time': '#A6785B',
  'Other': '#8A8880',
}

export default function ConnectionsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [connections, setConnections] = useState<ConnectionResult[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [notEnoughData, setNotEnoughData] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedLine, setSelectedLine] = useState<ConnectionResult | null>(null)
  const [focusedBookId, setFocusedBookId] = useState<string | null>(null)

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

  const categoryFiltered = activeCategory ? connections.filter((c) => c.connection.category === activeCategory) : connections

  const filteredConnections = focusedBookId
    ? categoryFiltered.filter((c) => {
        const targetBook = books.find((b) => b.title === c.connection.bookTitle)
        return c.bookId === focusedBookId || targetBook?.id === focusedBookId
      })
    : categoryFiltered

  const nodeBookIds = [...new Set(connections.flatMap((c) => {
    const targetBook = books.find((b) => b.title === c.connection.bookTitle)
    return [c.bookId, targetBook?.id].filter(Boolean) as string[]
  }))]
  const nodeBooks = nodeBookIds.map((id) => books.find((b) => b.id === id)).filter(Boolean) as Book[]

  const bookPrimaryCategory: Record<string, string> = {}
  nodeBooks.forEach((book) => {
    const bookConnections = connections.filter((c) => c.bookId === book.id || books.find((b) => b.title === c.connection.bookTitle)?.id === book.id)
    const categoryCounts: Record<string, number> = {}
    bookConnections.forEach((c) => { categoryCounts[c.connection.category] = (categoryCounts[c.connection.category] || 0) + 1 })
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Other'
    bookPrimaryCategory[book.id] = topCategory
  })
  const clusteredNodeBooks = [...nodeBooks].sort((a, b) => {
    const catA = CATEGORY_ORDER.indexOf(bookPrimaryCategory[a.id])
    const catB = CATEGORY_ORDER.indexOf(bookPrimaryCategory[b.id])
    return catA - catB
  })

  const mapSize = 280
  const center = mapSize / 2
  const radius = mapSize / 2 - 40
  const nodePositions: Record<string, { x: number; y: number }> = {}
  clusteredNodeBooks.forEach((book, i) => {
    const angle = (i / clusteredNodeBooks.length) * 2 * Math.PI - Math.PI / 2
    nodePositions[book.id] = {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    }
  })

  const lines = connections
    .map((c) => {
      const targetBook = books.find((b) => b.title === c.connection.bookTitle)
      if (!targetBook) return null
      const from = nodePositions[c.bookId]
      const to = nodePositions[targetBook.id]
      if (!from || !to) return null
      const touchesFocus = !focusedBookId || c.bookId === focusedBookId || targetBook.id === focusedBookId
      return { from, to, color: CATEGORY_COLORS[c.connection.category] || '#8A8880', connection: c, targetBookId: targetBook.id, touchesFocus }
    })
    .filter(Boolean) as { from: { x: number; y: number }; to: { x: number; y: number }; color: string; connection: ConnectionResult; targetBookId: string; touchesFocus: boolean }[]

  const toggleFocus = (bookId: string) => {
    setFocusedBookId(focusedBookId === bookId ? null : bookId)
    setSelectedLine(null)
  }

  const discoveredCount = focusedBookId ? lines.filter((l) => l.touchesFocus).length : connections.length

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', fontFamily: 'Inter, sans-serif' }}>
      <ResponsiveStyles />
      <div className="aw-container" style={{ width: '100%', margin: '0 auto', padding: '60px 22px 110px', boxSizing: 'border-box' }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 500, color: '#3A3A38', marginBottom: 6, marginTop: 4 }}>Map</div>
        <div style={{ fontSize: 13, color: '#8A8880', marginBottom: 24 }}>How your books talk to each other.</div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 10px' }}>
            <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 16, color: '#6B8F76' }}>looking for threads between your books…</div>
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

        {!loading && connections.length > 0 && (
          <>
            {focusedBookId && (
              <div onClick={() => setFocusedBookId(null)} style={{ textAlign: 'center', fontSize: 12.5, fontWeight: 600, color: '#6B8F76', cursor: 'pointer', marginBottom: 10 }}>
                ← Show all books
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <svg
                viewBox={`0 0 ${mapSize} ${mapSize + 24}`}
                style={{ width: '100%', maxWidth: 480, height: 'auto' }}
              >
                {lines.map((line, i) => {
                  const midX = (line.from.x + line.to.x) / 2
                  const midY = (line.from.y + line.to.y) / 2
                  const dimmed = focusedBookId && !line.touchesFocus
                  const isSelected = selectedLine === line.connection
                  const showLabel = focusedBookId && line.touchesFocus
                  return (
                    <g key={i}>
                      <line
                        x1={line.from.x} y1={line.from.y} x2={line.to.x} y2={line.to.y}
                        stroke={line.color} strokeWidth={isSelected ? 3 : 1.5}
                        opacity={dimmed ? 0.08 : isSelected ? 0.9 : 0.5}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedLine(isSelected ? null : line.connection)}
                      />
                      {showLabel && (
                        <text
                          x={midX} y={midY - 3}
                          textAnchor="middle" fontSize="7.5" fontWeight="600" fill={line.color}
                          fontFamily="Inter, sans-serif"
                          style={{ cursor: 'pointer', pointerEvents: 'none' }}
                        >
                          {line.connection.connection.theme.length > 20 ? line.connection.connection.theme.slice(0, 18) + '…' : line.connection.connection.theme}
                        </text>
                      )}
                    </g>
                  )
                })}
                {clusteredNodeBooks.map((book) => {
                  const pos = nodePositions[book.id]
                  const labelBelow = pos.y > center
                  const dimmed = focusedBookId && focusedBookId !== book.id && !lines.some((l) => l.touchesFocus && (l.connection.bookId === book.id || l.targetBookId === book.id))
                  return (
                    <g key={book.id} onClick={() => toggleFocus(book.id)} style={{ cursor: 'pointer' }} opacity={dimmed ? 0.25 : 1}>
                      <circle cx={pos.x} cy={pos.y} r={focusedBookId === book.id ? 21 : 18} fill={book.cover_color ?? '#3b3a5c'} stroke={focusedBookId === book.id ? '#6B8F76' : '#FAF9F6'} strokeWidth={focusedBookId === book.id ? 3 : 2.5} />
                      {book.cover_url && (
                        <clipPath id={`clip-${book.id}`}>
                          <circle cx={pos.x} cy={pos.y} r={focusedBookId === book.id ? 21 : 18} />
                        </clipPath>
                      )}
                      {book.cover_url && (
                        <image href={book.cover_url} x={pos.x - 21} y={pos.y - 21} width={42} height={42} clipPath={`url(#clip-${book.id})`} preserveAspectRatio="xMidYMid slice" />
                      )}
                      <text
                        x={pos.x} y={labelBelow ? pos.y + 34 : pos.y - 26}
                        textAnchor="middle" fontSize="9" fontWeight="600" fill="#3A3A38"
                        fontFamily="Inter, sans-serif"
                      >
                        {book.title.length > 18 ? book.title.slice(0, 16) + '…' : book.title}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>

            <div style={{ textAlign: 'center', fontSize: 12.5, color: '#8A8880', marginBottom: 20 }}>
              {discoveredCount} connection{discoveredCount === 1 ? '' : 's'} discovered
            </div>

            {selectedLine && (
              <div style={{ background: '#EFE4C8', border: '1px solid rgba(184,147,90,0.4)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 12.5, color: '#b8935a', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700 }}>{selectedLine.bookTitle}</span> ↔ <span style={{ fontWeight: 700 }}>{selectedLine.connection.bookTitle}</span> · {selectedLine.connection.theme}
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#5c4a26' }}>{selectedLine.connection.note}</div>
              </div>
            )}

            {availableCategories.length > 0 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 2 }}>
                <div
                  onClick={() => setActiveCategory(null)}
                  style={{
                    flex: '0 0 auto', padding: '8px 16px', borderRadius: 100, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
                    background: activeCategory === null ? '#3A3A38' : '#F3F1EC',
                    color: activeCategory === null ? '#FAF9F6' : '#5c5642',
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
                      flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 100, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
                      background: activeCategory === cat ? '#3A3A38' : '#F3F1EC',
                      color: activeCategory === cat ? '#FAF9F6' : '#5c5642',
                      border: '1px solid rgba(58,58,56,0.08)',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[cat], display: 'inline-block' }} />
                    {cat}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredConnections.map((c) => {
                const book = books.find((b) => b.id === c.bookId)
                return (
                  <div
                    key={`${c.bookId}-${c.connection.bookTitle}`}
                    onClick={() => router.push(`/journal?book=${c.bookId}`)}
                    style={{ background: '#EFE4C8', border: '1px solid rgba(184,147,90,0.4)', borderRadius: 14, padding: 18, cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 26, height: 34, borderRadius: 3, backgroundColor: book?.cover_color ?? '#3b3a5c', backgroundImage: book?.cover_url ? `url(${book.cover_url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#3A3A38' }}>{c.bookTitle}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, color: CATEGORY_COLORS[c.connection.category] || '#8A8880', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: CATEGORY_COLORS[c.connection.category] || '#8A8880', display: 'inline-block' }} />
                        {c.connection.category}
                      </div>
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 400, color: '#b8935a', marginBottom: 8 }}>
                      connects to <span style={{ fontWeight: 700 }}>{c.connection.bookTitle}</span> · {c.connection.theme}
                    </div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#5c4a26' }}>{c.connection.note}</div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
