'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getBooks, getEntriesForUser, getCheckinCount, summarizeRecentCheckin, type Book, type Entry } from '@/utils/supabase/queries'
import BottomNav from '@/components/BottomNav'
import { createClient } from '@/utils/supabase/client'

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
  const [memorySummaries, setMemorySummaries] = useState<Record<string, string>>({})
  const summaryCache = useRef<Record<string, string>>({})

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

  // Group entries into "sessions" — entries from the same book within 10 minutes of each other
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

  const recentSessions = sessions.slice(0, 5)

  const memories = recentSessions.map((s) => {
    const book = books.find((b) => b.id === s.bookId)
    const sessionKey = s.entries.map((e) => e.id).join('-')
    const summary = memorySummaries[sessionKey]
    return {
      id: sessionKey,
      book,
      bookTitle: book?.title ?? '',
      bookId: s.bookId,
      sessionKey,
      sessionEntries: s.entries,
      text: summary ?? null,
    }
  })

  useEffect(() => {
    memories.forEach((m) => {
      if (!m.book || memorySummaries[m.sessionKey] || summaryCache.current[m.sessionKey]) return
      summaryCache.current[m.sessionKey] = '…' // mark as in-flight to avoid duplicate calls
      summarizeRecentCheckin(m.book, m.sessionEntries).then((summary) => {
        if (summary) {
          summaryCache.current[m.sessionKey] = summary
          setMemorySummaries((prev) => ({ ...prev, [m.sessionKey]: summary }))
        }
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

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 560, width: '100%', margin: '0 auto', padding: '60px 22px 110px' }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 500, color: '#3A3A38', marginBottom: 22 }}>
          Afterwords
        </div>

        {loading && <div style={{ color: '#8A8880', fontSize: 13 }}>Loading your shelf…</div>}

        {!loading && isEmpty && (
          <div style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 19, color: '#3A3A38', maxWidth: 260 }}>Your shelf is empty.</div>
            <div style={{ fontSize: 13.5, color: '#5c5642', maxWidth: 260, lineHeight: 1.5 }}>Add your first book to start reflecting as you read.</div>
            <button onClick={() => router.push('/add-book')} style={{ marginTop: 10, background: '#3A3A38', color: '#f3ecdc', fontWeight: 600, fontSize: 14, padding: '13px 28px', borderRadius: 100, border: 'none', cursor: 'pointer' }}>
              Add a book
            </button>
          </div>
        )}

        {!loading && !isEmpty && (
          <>
            {memories.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8880', marginBottom: 10 }}>Memories</div>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
                  {memories.map((m) => (
                    <div key={m.id} onClick={() => router.push(`/journal?book=${m.bookId}`)} style={{ flex: '0 0 auto', width: 210, background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 14, padding: 16, cursor: 'pointer' }}>
                      <div style={{ fontFamily: 'Spectral, serif', fontSize: 18, lineHeight: 1.35, color: '#3f3b2e' }}>
                        {m.text ?? 'Remembering…'}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6B8F76', marginTop: 10 }}>{m.bookTitle}</div>
                    </div>
                  ))}
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
                      color: genreFilter === g ? '#f3ecdc' : '#5c5642',
                      border: '1px solid rgba(58,58,56,0.08)',
                    }}
                  >
                    {g}
                  </div>
                ))}
              </div>
            )}

            {currentlyReading.length > 0 && <Shelf title="Currently Reading" books={currentlyReading} progressLabel={progressLabel} progressPct={progressPct} router={router} />}
            {wantToRead.length > 0 && <Shelf title="Want to Read" books={wantToRead} progressLabel={progressLabel} progressPct={progressPct} router={router} />}
            {finished.length > 0 && <Shelf title="Finished" books={finished} progressLabel={progressLabel} progressPct={progressPct} router={router} />}
          </>
        )}

        {!isEmpty && (
          <button
            onClick={() => router.push('/add-book')}
            style={{
              position: 'fixed', left: 'calc(50% + 280px - 72px)', bottom: 92, width: 52, height: 52, borderRadius: '50%',
              background: '#6B8F76', color: '#fff', border: 'none', fontSize: 26, cursor: 'pointer',
              boxShadow: '0 10px 20px rgba(184,147,90,0.4)', zIndex: 40,
            }}
          >
            +
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

function Shelf({
  title, books, progressLabel, progressPct, router,
}: {
  title: string
  books: Book[]
  progressLabel: (b: Book) => string
  progressPct: (b: Book) => number
  router: ReturnType<typeof useRouter>
}) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8880', marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4 }}>
        {books.map((book) => (
          <div key={book.id} style={{ flex: '0 0 auto', width: 126 }}>
            <div
              style={{
                width: 126, height: 172, borderRadius: 8,
                backgroundColor: book.cover_url ? '#e8e2d0' : (book.cover_color ?? '#3b3a5c'),
                backgroundImage: book.cover_url ? `url(${book.cover_url})` : undefined,
                backgroundSize: 'cover', backgroundPosition: 'center',
                boxShadow: '0 6px 14px rgba(0,0,0,0.18)',
              }}
            />
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13.5, fontWeight: 600, color: '#3A3A38', marginTop: 8, lineHeight: 1.3 }}>{book.title}</div>
            <div style={{ fontSize: 11, color: '#8A8880', marginTop: 2 }}>{book.author}</div>
            {book.genre && <div style={{ fontSize: 10, fontWeight: 600, color: '#6B8F76', marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{book.genre}</div>}

            {book.status !== 'finished' && (
              <div style={{ height: 3, background: 'rgba(58,58,56,0.08)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#6B8F76', width: `${progressPct(book)}%` }} />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <div style={{ fontSize: 11, color: '#8A8880' }}>{progressLabel(book)}</div>
              {book.status !== 'finished' ? (
                <div onClick={() => goToCheckin(book.id, router)} style={{ fontSize: 11, fontWeight: 600, color: '#3A3A38', cursor: 'pointer' }}>Continue →</div>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <div onClick={() => router.push(`/journal?book=${book.id}`)} style={{ fontSize: 11, fontWeight: 600, color: '#3A3A38', cursor: 'pointer' }}>Journal →</div>
                  <div onClick={() => router.push(`/checkin/${book.id}?mode=review`)} style={{ fontSize: 11, fontWeight: 600, color: '#6B8F76', cursor: 'pointer' }}>Revisit →</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}