'use client'

import { useEffect, useState } from 'react'
import { forceSimulation, forceManyBody, forceLink, forceCenter, forceCollide } from 'd3-force'
import { useRouter } from 'next/navigation'
import { getBooks, getEntriesForUser, findAllConnections, type Book, type BookConnection } from '@/utils/supabase/queries'
import BottomNav from '@/components/BottomNav'
import ResponsiveStyles from '@/components/ResponsiveStyles'

type ConnectionResult = { bookId: string; bookTitle: string; connection: BookConnection }

const CATEGORY_ORDER = ['Identity & Self', 'Loss & Grief', 'Love & Connection', 'Fear & Courage', 'Meaning & Purpose', 'Change & Growth', 'Memory & Time', 'Other']
const STRENGTH_LABELS: Record<string, { label: string; dots: number }> = {
  strong: { label: 'Deep Connection', dots: 3 },
  moderate: { label: 'Related', dots: 2 },
  loose: { label: 'Loose Parallel', dots: 1 },
}
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
  const [activeTopic, setActiveTopic] = useState<string | null>(null)
  const [simPositions, setSimPositions] = useState<Record<string, { x: number; y: number }>>({})

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
  const availableTopics = [...new Set(connections.flatMap((c) => c.connection.topics || []))].sort()

  const totalConnections = connections.length
  const uniqueThemes = new Set(connections.map((c) => c.connection.theme)).size

  const categoryCounts: Record<string, number> = {}
  connections.forEach((c) => {
    categoryCounts[c.connection.category] = (categoryCounts[c.connection.category] || 0) + 1
  })
  const mostRecurringCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  const categoryFiltered = connections
    .filter((c) => !activeCategory || c.connection.category === activeCategory)
    .filter((c) => !activeTopic || (c.connection.topics || []).includes(activeTopic))

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

  const mapSize = 280

  useEffect(() => {
    if (nodeBooks.length === 0) return

    type SimNode = { id: string; x?: number; y?: number }
    const nodes: SimNode[] = nodeBooks.map((b) => ({ id: b.id }))
    const links = connections
      .map((c) => {
        const targetBook = books.find((b) => b.title === c.connection.bookTitle)
        if (!targetBook) return null
        return { source: c.bookId, target: targetBook.id }
      })
      .filter(Boolean) as { source: string; target: string }[]

    const sim = forceSimulation(nodes as any)
      .force('charge', forceManyBody().strength(-180))
      .force('link', forceLink(links as any).id((d: any) => d.id).distance(90))
      .force('center', forceCenter(mapSize / 2, (mapSize + 24) / 2))
      .force('collide', forceCollide(30))
      .stop()

    for (let i = 0; i < 300; i++) sim.tick()

    const positions: Record<string, { x: number; y: number }> = {}
    nodes.forEach((n) => {
      positions[n.id] = { x: n.x ?? mapSize / 2, y: n.y ?? (mapSize + 24) / 2 }
    })
    setSimPositions(positions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections, books])

  const lines = connections
    .map((c) => {
      const targetBook = books.find((b) => b.title === c.connection.bookTitle)
      if (!targetBook) return null
      const from = simPositions[c.bookId]
      const to = simPositions[targetBook.id]
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
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 500, color: '#3A3A38', marginBottom: 4, marginTop: 4 }}>Your Reading Mind</div>
        <div style={{ fontSize: 13, color: '#8A8880', marginBottom: 20 }}>How your books talk to each other.</div>

        {!loading && connections.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            <div style={{ flex: 1, background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: '#3A3A38' }}>{totalConnections}</div>
              <div style={{ fontSize: 10.5, color: '#8A8880', marginTop: 2 }}>connection{totalConnections === 1 ? '' : 's'}</div>
            </div>
            <div style={{ flex: 1, background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 600, color: '#3A3A38' }}>{uniqueThemes}</div>
              <div style={{ fontSize: 10.5, color: '#8A8880', marginTop: 2 }}>recurring theme{uniqueThemes === 1 ? '' : 's'}</div>
            </div>
            {mostRecurringCategory && (
              <div style={{ flex: 1.4, background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 2 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[mostRecurringCategory] }} />
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13, fontWeight: 600, color: '#3A3A38' }}>{mostRecurringCategory}</div>
                </div>
                <div style={{ fontSize: 10.5, color: '#8A8880' }}>most recurring</div>
              </div>
            )}
          </div>
        )}

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

            <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#3A3A38', marginBottom: 8, minHeight: 18 }}>
              {focusedBookId ? books.find((b) => b.id === focusedBookId)?.title : 'Tap a book to explore'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <svg
                viewBox={`0 0 ${mapSize} ${mapSize + 24}`}
                style={{ width: '100%', maxWidth: 480, height: 'auto' }}
              >
                {lines.map((line, i) => {
                  const dimmed = focusedBookId && !line.touchesFocus
                  const isSelected = selectedLine === line.connection
                  return (
                    <line
                      key={i}
                      x1={line.from.x} y1={line.from.y} x2={line.to.x} y2={line.to.y}
                      stroke={line.color} strokeWidth={isSelected ? 3 : 1.5}
                      opacity={dimmed ? 0.08 : isSelected ? 0.9 : 0.5}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedLine(isSelected ? null : line.connection)}
                    />
                  )
                })}
                {nodeBooks.map((book) => {
                  const pos = simPositions[book.id]
                  if (!pos) return null
                  const isFocused = focusedBookId === book.id
                  const dimmed = focusedBookId && !isFocused && !lines.some((l) => l.touchesFocus && (l.connection.bookId === book.id || l.targetBookId === book.id))
                  return (
                    <g key={book.id} onClick={() => toggleFocus(book.id)} style={{ cursor: 'pointer' }} opacity={dimmed ? 0.25 : 1}>
                      <circle cx={pos.x} cy={pos.y} r={isFocused ? 21 : 16} fill={book.cover_color ?? '#3b3a5c'} stroke={isFocused ? '#6B8F76' : '#FAF9F6'} strokeWidth={isFocused ? 3 : 2} />
                      {book.cover_url && (
                        <clipPath id={`clip-${book.id}`}>
                          <circle cx={pos.x} cy={pos.y} r={isFocused ? 21 : 16} />
                        </clipPath>
                      )}
                      {book.cover_url && (
                        <image href={book.cover_url} x={pos.x - (isFocused ? 21 : 16)} y={pos.y - (isFocused ? 21 : 16)} width={isFocused ? 42 : 32} height={isFocused ? 42 : 32} clipPath={`url(#clip-${book.id})`} preserveAspectRatio="xMidYMid slice" />
                      )}
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

            {availableTopics.length > 0 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 2 }}>
                {availableTopics.map((topic) => (
                  <div
                    key={topic}
                    onClick={() => setActiveTopic(activeTopic === topic ? null : topic)}
                    style={{
                      flex: '0 0 auto', padding: '6px 14px', borderRadius: 100, fontSize: 11.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
                      background: activeTopic === topic ? '#6B8F76' : 'transparent',
                      color: activeTopic === topic ? '#FAF9F6' : '#6B8F76',
                      border: `1px solid ${activeTopic === topic ? '#6B8F76' : 'rgba(107,143,118,0.35)'}`,
                    }}
                  >
                    #{topic}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredConnections.map((c) => {
                const book = books.find((b) => b.id === c.bookId)
                const targetBook = books.find((b) => b.title === c.connection.bookTitle)
                return (
                  <div
                    key={`${c.bookId}-${c.connection.bookTitle}`}
                    style={{ background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 14, padding: 18 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, color: CATEGORY_COLORS[c.connection.category] || '#8A8880', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: CATEGORY_COLORS[c.connection.category] || '#8A8880', display: 'inline-block' }} />
                        {c.connection.category}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} title={STRENGTH_LABELS[c.connection.strength]?.label}>
                        {[1, 2, 3].map((i) => (
                          <span
                            key={i}
                            style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: i <= (STRENGTH_LABELS[c.connection.strength]?.dots ?? 2) ? '#6B8F76' : 'rgba(58,58,56,0.15)',
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 600, color: '#3A3A38', marginBottom: (c.connection.topics || []).length ? 8 : 12 }}>
                      {c.connection.theme}
                    </div>

                    {(c.connection.topics || []).length > 0 && (
                      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                        {(c.connection.topics || []).map((topic) => (
                          <div key={topic} onClick={() => setActiveTopic(activeTopic === topic ? null : topic)} style={{ fontSize: 10.5, fontWeight: 600, color: '#6B8F76', cursor: 'pointer' }}>
                            #{topic}
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div onClick={() => router.push(`/journal?book=${c.bookId}`)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <div style={{ width: 20, height: 27, borderRadius: 3, backgroundColor: book?.cover_color ?? '#3b3a5c', backgroundImage: book?.cover_url ? `url(${book.cover_url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#3A3A38' }}>{c.bookTitle}</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#8A8880' }}>×</div>
                      <div onClick={() => targetBook && router.push(`/journal?book=${targetBook.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: targetBook ? 'pointer' : 'default' }}>
                        {targetBook && (
                          <div style={{ width: 20, height: 27, borderRadius: 3, backgroundColor: targetBook.cover_color ?? '#3b3a5c', backgroundImage: targetBook.cover_url ? `url(${targetBook.cover_url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />
                        )}
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#3A3A38' }}>{c.connection.bookTitle}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: 13.5, lineHeight: 1.55, color: '#4a4636', marginBottom: c.connection.evidence.length ? 14 : 0 }}>
                      {c.connection.note}
                    </div>

                    {c.connection.evidence.length > 0 && (
                      <div style={{ borderTop: '1px solid rgba(58,58,56,0.08)', paddingTop: 12 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B8F76', marginBottom: 6 }}>Evidence</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {c.connection.evidence.map((ev, i) => (
                            <div key={i} style={{ fontSize: 12.5, color: '#4a4636', display: 'flex', gap: 6 }}>
                              <span>·</span><span>{ev}</span>
                            </div>
                          ))}
                        </div>
                        <div onClick={() => router.push(`/journal?book=${c.bookId}`)} style={{ fontSize: 11.5, fontWeight: 600, color: '#6B8F76', marginTop: 8, cursor: 'pointer' }}>
                          View memories →
                        </div>
                      </div>
                    )}
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
