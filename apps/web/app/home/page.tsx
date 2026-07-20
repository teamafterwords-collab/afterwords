'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  getBooks, getEntriesForUser, getCheckinCount, generateMemoryCardInsight,
  type Book, type Entry, type MemoryCardInsight,
} from '@/utils/supabase/queries'
import BottomNav from '@/components/BottomNav'

type MemoryItem = {
  id: string
  sessionKey: string
  book: Book | undefined
  bookTitle: string
  bookId: string
  rawText: string | null
  sessionEntries: Entry[]
}

async function goToCheckin(bookId: string, router: ReturnType<typeof useRouter>) {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_beta_tester')
    .eq('id', userData.user?.id)
    .single()

  if (profile?.is_beta_tester) {
    router.push(`/checkin/${bookId}`)
    return
  }

  const count = await getCheckinCount()
  if (count >= 5) {
    router.push('/paywall')
    return
  }
  router.push(`/checkin/${bookId}`)
}

export default function HomePage() {
  const router = useRouter()
  const [books, setBooks] = useState<Book[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [genreFilter, setGenreFilter] = useState<string | null>(null)
  const [memoryInsights, setMemoryInsights] = useState<Record<string, MemoryCardInsight>>({})
  const insightCache = useRef<Record<string, MemoryCardInsight>>({})
  const [detailMemory, setDetailMemory] = useState<MemoryItem | null>(null)

  useEffect(() => {
    Promise.all([getBooks(), getEntriesForUser()]).then(([b, e]) => {
      setBooks(b)
      setEntries(e)
      setLoading(false)
    })
  }, [])

  const filteredBooks = genreFilter ? books.filter((b) => b.genre === genreFilter) : books
  const currentlyReading = filteredBooks.filter((b) => b.status === 'currently_reading')
  const wantToRead = filteredBooks.filter((b) => b.status === 'want_to_read')
  const finished = filteredBooks.filter((b) => b.status === 'finished')
  const isEmpty = books.length === 0

  const genres = [...new Set(books.map((b) => b.genre).filter(Boolean))] as string[]

  // Most recently active currently-reading book = the hero
  const lastActiveByBook: Record<string, string> = {}
  entries.forEach((e) => {
    if (!lastActiveByBook[e.book_id] || e.created_at > lastActiveByBook[e.book_id]) {
      lastActiveByBook[e.book_id] = e.created_at
    }
  })
  const sortedCurrentlyReading = [...currentlyReading].sort((a, b) => {
    const aTime = lastActiveByBook[a.id] || a.created_at
    const bTime = lastActiveByBook[b.id] || b.created_at
    return bTime.localeCompare(aTime)
  })
  const heroBook = sortedCurrentlyReading[0]
  const otherCurrentlyReading = sortedCurrentlyReading.slice(1)

  // Group into sessions (same book, within 10 min), then pick the most substantive
  // answer from each session's most recent occurrence — using the user's own words.
  const SESSION_WINDOW_MS = 10 * 60 * 1000
  const sortedEntries = [...entries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  type Session = { bookId: string; entries: Entry[]; latestAt: number }
  const sessions: Session[] = []
  sortedEntries.forEach((e) => {
    const t = new Date(e.created_at).getTime()
    const existing = sessions.find((s) => s.bookId === e.book_id && Math.abs(s.latestAt - t) < SESSION_WINDOW_MS)
    if (existing) {
      existing.entries.push(e)
      existing.latestAt = Math.max(existing.latestAt, t)
    } else {
      sessions.push({ bookId: e.book_id, entries: [e], latestAt: t })
    }
  })

  const truncateChars = (text: string, maxLen: number) => {
    if (text.length <= maxLen) return { display: text, truncated: false }
    const slice = text.slice(0, maxLen)
    const lastSpace = slice.lastIndexOf(' ')
    const clean = lastSpace > maxLen * 0.7 ? slice.slice(0, lastSpace) : slice
    return { display: clean.trim() + '…', truncated: true }
  }

  const memories: MemoryItem[] = sessions.slice(0, 5).map((s) => {
    const book = books.find((b) => b.id === s.bookId)

    const quote = s.entries.find((e) => e.kind === 'quote')
    const bestReflection = [...s.entries]
      .filter((e) => e.kind === 'entry' && e.response)
      .sort((a, b) => (b.response?.length ?? 0) - (a.response?.length ?? 0))[0]

    const source = quote || bestReflection
    const rawText = source ? (source.kind === 'quote' ? source.text! : source.response!) : null

    const sessionKey = s.entries.map((e) => e.id).join('-')

    return {
      id: sessionKey,
      sessionKey,
      book,
      bookTitle: book?.title ?? '',
      bookId: s.bookId,
      rawText,
      sessionEntries: s.entries,
    }
  })

  useEffect(() => {
    memories.forEach((m) => {
      if (!m.book || !m.rawText) return
      if (memoryInsights[m.sessionKey] || insightCache.current[m.sessionKey]) return
      insightCache.current[m.sessionKey] = { title: '…', insight: null }
      generateMemoryCardInsight(m.book, m.rawText, m.sessionEntries).then((result) => {
        insightCache.current[m.sessionKey] = result
        setMemoryInsights((prev) => ({ ...prev, [m.sessionKey]: result }))
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, books])

  const progressLabel = (b: Book) => {
    const total = b.tracking_mode === 'page' ? b.total_pages : b.total_chapters
    const unit = b.tracking_mode === 'page' ? 'p.' : 'Ch'
    return `${unit} ${b.current_chapter}/${total ?? '?'}`
  }

  const progressPct = (b: Book) => {
    const total = b.tracking_mode === 'page' ? b.total_pages : b.total_chapters
    if (!total) return 0
    return Math.round((b.current_chapter / total) * 100)
  }

  const responsiveStyles = `
@media (min-width: 768px) {
  .aw-hero { padding: 24px !important; }
  .aw-hero-cover { width: 96px !important; height: 132px !important; }
}
@media (min-width: 1024px) {
  .aw-shelf-grid { display: grid !important; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)) !important; gap: 18px !important; }
}
`

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', fontFamily: 'Inter, sans-serif' }}>
      <style>{responsiveStyles}</style>
      <div className="aw-container" style={{ width: '100%', margin: '0 auto', padding: '60px 22px 110px', boxSizing: 'border-box' }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 500, color: '#3A3A38', marginBottom: 22 }}>
          Afterwords
        </div>

        {loading && <div style={{ color: '#8A8880', fontSize: 13 }}>Loading your shelf…</div>}

        {!loading && isEmpty && (
          <div style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 19, color: '#3A3A38', maxWidth: 260 }}>Your shelf is empty.</div>
            <div style={{ fontSize: 13.5, color: '#5c5642', maxWidth: 260, lineHeight: 1.5 }}>Add your first book to start reflecting as you read.</div>
            <button onClick={() => router.push('/add-book')} style={{ marginTop: 10, background: '#3A3A38', color: '#FAF9F6', fontWeight: 600, fontSize: 14, padding: '13px 28px', borderRadius: 100, border: 'none', cursor: 'pointer' }}>
              Add a book
            </button>
          </div>
        )}

        {!loading && !isEmpty && (
          <>
            {/* HERO: Continue Reading */}
            {heroBook && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8880', marginBottom: 10 }}>Continue Reading</div>
                <div
                  className="aw-hero"
                  onClick={() => goToCheckin(heroBook.id, router)}
                  style={{
                    display: 'flex', gap: 16, alignItems: 'center', background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)',
                    borderRadius: 18, padding: 18, cursor: 'pointer',
                  }}
                >
                  <div
                    className="aw-hero-cover"
                    style={{
                      width: 76, height: 104, borderRadius: 8, flexShrink: 0,
                      backgroundColor: heroBook.cover_url ? '#e8e2d0' : (heroBook.cover_color ?? '#3b3a5c'),
                      backgroundImage: heroBook.cover_url ? `url(${heroBook.cover_url})` : undefined,
                      backgroundSize: 'cover', backgroundPosition: 'center',
                      boxShadow: '0 6px 14px rgba(0,0,0,0.15)',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 600, color: '#3A3A38', marginBottom: 2 }}>{heroBook.title}</div>
                    <div style={{ fontSize: 12.5, color: '#8A8880', marginBottom: 10 }}>{heroBook.author}</div>
                    <div style={{ height: 4, background: 'rgba(58,58,56,0.1)', borderRadius: 2, marginBottom: 6, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#6B8F76', width: `${progressPct(heroBook)}%` }} />
                    </div>
                    <div style={{ fontSize: 11.5, color: '#8A8880', marginBottom: 12 }}>{progressLabel(heroBook)}</div>
                    <div style={{ display: 'inline-block', background: '#3A3A38', color: '#FAF9F6', fontWeight: 600, fontSize: 13, padding: '9px 18px', borderRadius: 100 }}>
                      Continue →
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Other currently-reading books, smaller row */}
            {otherCurrentlyReading.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8880', marginBottom: 10 }}>Also Reading</div>
                <div className="aw-shelf-grid" style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4 }}>
                  {otherCurrentlyReading.map((book) => (
                    <div key={book.id} onClick={() => goToCheckin(book.id, router)} style={{ flex: '0 0 auto', width: 100, cursor: 'pointer' }}>
                      <div
                        style={{
                          width: 100, height: 136, borderRadius: 8,
                          backgroundColor: book.cover_url ? '#e8e2d0' : (book.cover_color ?? '#3b3a5c'),
                          backgroundImage: book.cover_url ? `url(${book.cover_url})` : undefined,
                          backgroundSize: 'cover', backgroundPosition: 'center',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
                        }}
                      />
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#3A3A38', marginTop: 6, lineHeight: 1.3 }}>{book.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {memories.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8880', marginBottom: 10 }}>Memories</div>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
                  {memories.map((m) => {
                    const info = memoryInsights[m.sessionKey]
                    const isLoadingInfo = !info || info.title === '…'
                    const quoteShort = m.rawText ? truncateChars(m.rawText, 140) : null
                    const insightShort = info?.insight ? truncateChars(info.insight, 280) : null

                    return (
                      <div
                        key={m.id}
                        onClick={() => setDetailMemory(m)}
                        style={{ flex: '0 0 auto', width: 230, background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 14, padding: 16, cursor: 'pointer', boxSizing: 'border-box', overflow: 'hidden' }}
                      >
                        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13.5, fontWeight: 600, color: '#3A3A38', marginBottom: 8 }}>
                          {isLoadingInfo ? '…' : info.title}
                        </div>

                        {quoteShort && (
                          <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 14, lineHeight: 1.4, color: '#3A3A38', marginBottom: 10 }}>
                            &quot;{quoteShort.display}&quot;
                          </div>
                        )}

                        {insightShort && (
                          <div style={{ marginBottom: 4 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B8F76', marginBottom: 3 }}>Insight</div>
                            <div style={{ fontSize: 12, lineHeight: 1.5, color: '#4a4636' }}>{insightShort.display}</div>
                            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#6B8F76', marginTop: 4 }}>See why →</div>
                          </div>
                        )}

                        <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#8A8880', marginTop: 10 }}>{m.bookTitle}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {genres.length > 0 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 24, paddingBottom: 2 }}>
                {genres.map((g) => (
                  <div
                    key={g}
                    onClick={() => setGenreFilter(genreFilter === g ? null : g)}
                    style={{
                      flex: '0 0 auto', padding: '8px 16px', borderRadius: 100, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
                      background: genreFilter === g ? '#3A3A38' : '#F3F1EC',
                      color: genreFilter === g ? '#FAF9F6' : '#5c5642',
                      border: '1px solid rgba(58,58,56,0.08)',
                    }}
                  >
                    {g}
                  </div>
                ))}
              </div>
            )}

            {wantToRead.length > 0 && <Shelf title="Want to Read" books={wantToRead} progressLabel={progressLabel} progressPct={progressPct} router={router} muted />}
            {finished.length > 0 && <Shelf title="Finished" books={finished} progressLabel={progressLabel} progressPct={progressPct} router={router} muted />}
          </>
        )}

        {!isEmpty && (
          <button
            onClick={() => router.push('/add-book')}
            className="aw-fab-add"
            style={{
              width: 52, height: 52, borderRadius: '50%',
              background: '#6B8F76', color: '#fff', border: 'none', fontSize: 26, cursor: 'pointer',
              boxShadow: '0 10px 20px rgba(107,143,118,0.4)',
            }}
          >
            +
          </button>
        )}
      </div>

      {detailMemory && (() => {
        const info = memoryInsights[detailMemory.sessionKey]
        return (
          <div
            onClick={() => setDetailMemory(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(58,58,56,0.4)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: '#FAF9F6', width: '100%', maxWidth: 480, borderRadius: 20, padding: '28px 24px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', maxHeight: '80vh', overflowY: 'auto', boxSizing: 'border-box' }}
            >
              <div onClick={() => setDetailMemory(null)} style={{ textAlign: 'right', fontSize: 20, color: '#8A8880', cursor: 'pointer', marginBottom: 6 }}>✕</div>

              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 600, color: '#3A3A38', marginBottom: 16 }}>
                {info?.title || detailMemory.bookTitle}
              </div>

              {detailMemory.rawText && (
                <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 17, lineHeight: 1.55, color: '#3A3A38', marginBottom: 18 }}>
                  &quot;{detailMemory.rawText}&quot;
                </div>
              )}

              {info?.insight && (
                <div style={{ background: '#F3F1EC', borderRadius: 12, padding: 16, marginBottom: 18 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B8F76', marginBottom: 6 }}>Insight</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: '#4a4636' }}>{info.insight}</div>
                </div>
              )}

              <div
                onClick={() => router.push(`/journal?book=${detailMemory.bookId}`)}
                style={{ textAlign: 'center', background: '#3A3A38', color: '#FAF9F6', fontWeight: 600, fontSize: 13.5, padding: 13, borderRadius: 100, cursor: 'pointer' }}
              >
                View in Journal →
              </div>
            </div>
          </div>
        )
      })()}

      <BottomNav />
    </div>
  )
}

function Shelf({
  title, books, progressLabel, progressPct, router, muted,
}: {
  title: string
  books: Book[]
  progressLabel: (b: Book) => string
  progressPct: (b: Book) => number
  router: ReturnType<typeof useRouter>
  muted?: boolean
}) {
  return (
    <div style={{ marginBottom: 26, opacity: muted ? 0.85 : 1 }}>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8880', marginBottom: 10 }}>
        {title}
      </div>
      <div className="aw-shelf-grid" style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4 }}>
        {books.map((book) => (
          <div key={book.id} style={{ flex: '0 0 auto', width: 100 }}>
            <div
              onClick={() => (book.status === 'finished' ? router.push(`/journal?book=${book.id}`) : goToCheckin(book.id, router))}
              style={{
                width: 100, height: 136, borderRadius: 8, cursor: 'pointer',
                backgroundColor: book.cover_url ? '#e8e2d0' : (book.cover_color ?? '#3b3a5c'),
                backgroundImage: book.cover_url ? `url(${book.cover_url})` : undefined,
                backgroundSize: 'cover', backgroundPosition: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
              }}
            />
            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#3A3A38', marginTop: 6, lineHeight: 1.3 }}>{book.title}</div>
          </div>
        ))}
      </div>
    </div>
  )
}