'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  getBooks, getEntriesForUser, findCrossBookConnection, saveQuote,
  type Book, type Entry,
} from '@/utils/supabase/queries'
import BottomNav from '@/components/BottomNav'

const PAGE_SIZE = 10

type SpeechRecognitionResultLike = { transcript: string }
interface SpeechRecognitionLike extends EventTarget {
  lang: string
  interimResults: boolean
  start: () => void
  onresult: ((e: { results: { 0: { 0: SpeechRecognitionResultLike } } }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

function JournalContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [books, setBooks] = useState<Book[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [genreFilter, setGenreFilter] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [connection, setConnection] = useState<{ bookTitle: string; theme: string; note: string } | null>(null)
  const [connectionLoading, setConnectionLoading] = useState(false)
  const connectionCache = useRef<Record<string, { bookTitle: string; theme: string; note: string } | null>>({})

  const [micListening, setMicListening] = useState(false)

  const [addQuoteOpen, setAddQuoteOpen] = useState(false)
  const [addQuoteText, setAddQuoteText] = useState('')
  const [addQuoteMic, setAddQuoteMic] = useState(false)
  const [addQuoteSaving, setAddQuoteSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const [b, e] = await Promise.all([getBooks(), getEntriesForUser()])
      setBooks(b)
      setEntries(e)
      setLoading(false)

      const bookParam = searchParams.get('book')
      if (bookParam) {
        setSelectedBookId(bookParam)
      } else if (e.length > 0) {
        setSelectedBookId(e[0].book_id)
      }
    }
    load()
  }, [searchParams])

  useEffect(() => {
    if (!selectedBookId) return
    loadConnection(selectedBookId)
  }, [selectedBookId, entries])

  const loadConnection = async (bookId: string) => {
    if (connectionCache.current[bookId] !== undefined) {
      setConnection(connectionCache.current[bookId])
      return
    }
    const book = books.find((b) => b.id === bookId)
    if (!book) return

    const currentEntries = entries.filter((e) => e.book_id === bookId)
    if (!currentEntries.length) return

    const otherBookIds = [...new Set(entries.filter((e) => e.book_id !== bookId).map((e) => e.book_id))]
    const otherBooksWithEntries = otherBookIds
      .map((id) => {
        const b = books.find((bk) => bk.id === id)
        const items = entries.filter((e) => e.book_id === id)
        return b ? { title: b.title, entries: items } : null
      })
      .filter(Boolean) as { title: string; entries: Entry[] }[]

    if (!otherBooksWithEntries.length) return

    setConnectionLoading(true)
    const result = await findCrossBookConnection(book, currentEntries, otherBooksWithEntries)
    connectionCache.current[bookId] = result
    setConnection(result)
    setConnectionLoading(false)
  }

  const genres = [...new Set(books.filter((b) => entries.some((e) => e.book_id === b.id)).map((b) => b.genre).filter(Boolean))] as string[]

  const isSearching = query.trim().length > 0
  const q = query.trim().toLowerCase()

  let filteredEntries: Entry[]
  if (isSearching) {
    filteredEntries = entries.filter((e) => {
      const book = books.find((b) => b.id === e.book_id)
      const haystack = e.kind === 'quote' ? e.text ?? '' : `${e.question ?? ''} ${e.response ?? ''}`
      return haystack.toLowerCase().includes(q) || (book && book.title.toLowerCase().includes(q))
    })
  } else {
    filteredEntries = entries.filter((e) => e.book_id === selectedBookId)
  }

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedEntries = filteredEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const bookChips = books
    .filter((b) => entries.some((e) => e.book_id === b.id) && (!genreFilter || b.genre === genreFilter))
    .sort((a, b) => {
      const aLatest = entries.find((e) => e.book_id === a.id)?.created_at ?? ''
      const bLatest = entries.find((e) => e.book_id === b.id)?.created_at ?? ''
      return bLatest.localeCompare(aLatest)
    })

  const selectBook = (id: string) => {
    setSelectedBookId(id)
    setQuery('')
    setPage(1)
    setAddQuoteOpen(false)
  }

  const startVoiceForSearch = () => {
    const SR = getSpeechRecognition()
    if (!SR) {
      alert('Voice input needs microphone access — try this on a deployed HTTPS site.')
      return
    }
    const recog = new SR()
    recog.lang = 'en-US'
    recog.interimResults = false
    setMicListening(true)
    recog.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setQuery((prev) => (prev ? prev + ' ' + transcript : transcript))
      setPage(1)
    }
    recog.onerror = () => setMicListening(false)
    recog.onend = () => setMicListening(false)
    recog.start()
  }

  const startVoiceForAddQuote = () => {
    const SR = getSpeechRecognition()
    if (!SR) {
      alert('Voice input needs microphone access — try this on a deployed HTTPS site.')
      return
    }
    const recog = new SR()
    recog.lang = 'en-US'
    recog.interimResults = false
    setAddQuoteMic(true)
    recog.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setAddQuoteText((prev) => (prev ? prev.trim() + ' ' + transcript : transcript))
    }
    recog.onerror = () => setAddQuoteMic(false)
    recog.onend = () => setAddQuoteMic(false)
    recog.start()
  }

  const submitNewQuote = async () => {
    if (!addQuoteText.trim() || !selectedBookId) return
    setAddQuoteSaving(true)
    await saveQuote(selectedBookId, addQuoteText)
    const freshEntries = await getEntriesForUser()
    setEntries(freshEntries)
    setAddQuoteText('')
    setAddQuoteOpen(false)
    setAddQuoteSaving(false)
  }

  const truncate = (text: string, limit: number) => {
    if (!text || text.length <= limit) return { display: text, needsMore: false }
    const slice = text.slice(0, limit)
    const lastSpace = slice.lastIndexOf(' ')
    const clean = lastSpace > limit * 0.7 ? slice.slice(0, lastSpace) : slice
    return { display: clean.trim() + '…', needsMore: true }
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#efe6d3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: '#efe6d3', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '60px 22px 110px' }}>
        <div style={{ fontFamily: 'Lora, serif', fontSize: 24, fontWeight: 700, color: '#33324a', marginBottom: 16, marginTop: 4 }}>Journal</div>

        <div style={{ position: 'relative', marginBottom: 18 }}>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
            placeholder="Search your reflections…"
            style={{ width: '100%', background: '#fbf6ec', border: '1px solid rgba(51,50,74,0.12)', borderRadius: 12, padding: '12px 44px 12px 14px', fontSize: 14, color: '#3f3b2e', boxSizing: 'border-box' }}
          />
          <div
            onClick={startVoiceForSearch}
            style={{ position: 'absolute', right: 8, top: 6, width: 32, height: 32, borderRadius: '50%', background: micListening ? '#b8935a' : '#33324a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="4.5" y="0.5" width="5" height="8" rx="2.5" fill="#f3ecdc" />
              <path d="M2 6.5C2 9.26 4.24 11.5 7 11.5C9.76 11.5 12 9.26 12 6.5" stroke="#f3ecdc" strokeWidth="1.3" strokeLinecap="round" />
              <line x1="7" y1="11.5" x2="7" y2="13.5" stroke="#f3ecdc" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {genres.length > 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 2 }}>
            {genres.map((g) => (
              <div
                key={g}
                onClick={() => setGenreFilter(genreFilter === g ? null : g)}
                style={{
                  flex: '0 0 auto', padding: '8px 16px', borderRadius: 100, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
                  background: genreFilter === g ? '#33324a' : '#fbf6ec',
                  color: genreFilter === g ? '#f3ecdc' : '#5c5642',
                  border: '1px solid rgba(51,50,74,0.14)',
                }}
              >
                {g}
              </div>
            ))}
          </div>
        )}

        {bookChips.length > 0 && (
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginBottom: 20, paddingBottom: 2 }}>
            {bookChips.map((b) => {
              const sel = !isSearching && b.id === selectedBookId
              return (
                <div
                  key={b.id}
                  onClick={() => selectBook(b.id)}
                  style={{
                    flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px 7px 7px', borderRadius: 100, cursor: 'pointer',
                    background: '#fbf6ec', border: `1.5px solid ${sel ? '#33324a' : 'rgba(51,50,74,0.12)'}`,
                  }}
                >
                  <div style={{ width: 22, height: 28, borderRadius: 3, backgroundColor: b.cover_color ?? '#3b3a5c', backgroundImage: b.cover_url ? `url(${b.cover_url})` : undefined, backgroundSize: 'cover' }} />
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: '#3f3b2e', whiteSpace: 'nowrap' }}>{b.title}</div>
                </div>
              )
            })}
          </div>
        )}

        {selectedBookId && !isSearching && (
          <>
            {!addQuoteOpen ? (
              <div
                onClick={() => setAddQuoteOpen(true)}
                style={{ textAlign: 'center', border: '1.5px dashed rgba(51,50,74,0.3)', borderRadius: 12, padding: 14, fontSize: 13, fontWeight: 500, color: '#5c5642', cursor: 'pointer', marginBottom: 16 }}
              >
                + Save a line you loved
              </div>
            ) : (
              <div style={{ background: '#fbf6ec', border: '1px solid rgba(51,50,74,0.12)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <textarea
                    value={addQuoteText}
                    onChange={(e) => setAddQuoteText(e.target.value)}
                    placeholder="Type or speak the line…"
                    style={{ width: '100%', minHeight: 90, background: '#efe6d3', border: '1px solid rgba(51,50,74,0.14)', borderRadius: 10, padding: '12px 44px 12px 12px', fontSize: 14, lineHeight: 1.5, color: '#3f3b2e', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                  <div
                    onClick={startVoiceForAddQuote}
                    style={{ position: 'absolute', right: 10, top: 10, width: 28, height: 28, borderRadius: '50%', background: addQuoteMic ? '#b8935a' : '#33324a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                      <rect x="4.5" y="0.5" width="5" height="8" rx="2.5" fill="#f3ecdc" />
                      <path d="M2 6.5C2 9.26 4.24 11.5 7 11.5C9.76 11.5 12 9.26 12 6.5" stroke="#f3ecdc" strokeWidth="1.3" strokeLinecap="round" />
                      <line x1="7" y1="11.5" x2="7" y2="13.5" stroke="#f3ecdc" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div onClick={() => { setAddQuoteOpen(false); setAddQuoteText('') }} style={{ flex: 1, textAlign: 'center', border: '1.5px solid rgba(51,50,74,0.2)', borderRadius: 100, padding: 10, fontSize: 13, fontWeight: 600, color: '#33324a', cursor: 'pointer' }}>
                    Cancel
                  </div>
                  <div onClick={submitNewQuote} style={{ flex: 1, textAlign: 'center', background: '#33324a', color: '#f3ecdc', fontWeight: 600, fontSize: 13, padding: 10, borderRadius: 100, cursor: 'pointer' }}>
                    {addQuoteSaving ? 'Saving…' : 'Save'}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {connectionLoading && (
          <div style={{ background: '#efe4c8', border: '1px solid rgba(184,147,90,0.4)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#8a7546' }}>Looking for connections to your other books…</div>
          </div>
        )}

        {!connectionLoading && connection && !isSearching && (
          <div style={{ background: '#efe4c8', border: '1px solid rgba(184,147,90,0.4)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 12.5, fontWeight: 400, color: '#b8935a', marginBottom: 8 }}>
              A connection to <span style={{ fontWeight: 700 }}>{connection.bookTitle}</span> · {connection.theme}
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#5c4a26' }}>{connection.note}</div>
          </div>
        )}

        {pagedEntries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 10px', fontSize: 13, color: '#8d8570' }}>
            No reflections yet — mark a chapter as read to start one.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pagedEntries.map((entry) => {
            const isQuote = entry.kind === 'quote'
            const book = books.find((b) => b.id === entry.book_id)
            if (isQuote) {
              return (
                <div key={entry.id} style={{ background: '#efe4c8', border: '1px solid rgba(184,147,90,0.35)', borderRadius: 14, padding: 16 }}>
                  <div style={{ fontFamily: 'Caveat, cursive', fontSize: 17, lineHeight: 1.5, color: '#5c4a26' }}>&quot;{entry.text}&quot;</div>
                  <div style={{ fontSize: 11, color: '#8a7546', marginTop: 8 }}>saved line · {new Date(entry.created_at).toLocaleDateString()}</div>
                </div>
              )
            }
            const t = truncate(entry.response ?? '', 120)
            const isExpanded = !!expanded[entry.id]
            return (
              <div key={entry.id} style={{ background: '#fbf6ec', border: '1px solid rgba(51,50,74,0.1)', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  {isSearching && <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#b8935a' }}>{book?.title}</div>}
                  <div style={{ fontSize: 11, color: '#8d8570' }}>{entry.chapter_range} · {new Date(entry.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ fontFamily: 'Lora, serif', fontSize: 13.5, fontWeight: 600, color: '#33324a', marginBottom: 5 }}>{entry.question}</div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: '#4a4636' }}>{isExpanded ? entry.response : t.display}</div>
                {t.needsMore && (
                  <div onClick={() => setExpanded((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))} style={{ fontSize: 12, fontWeight: 600, color: '#b8935a', marginTop: 6, cursor: 'pointer' }}>
                    {isExpanded ? 'Show less' : 'Read more'}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 20 }}>
            <div onClick={() => setPage(Math.max(1, currentPage - 1))} style={{ width: 36, height: 36, borderRadius: '50%', background: currentPage > 1 ? '#33324a' : 'rgba(51,50,74,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="8" height="14" viewBox="0 0 8 14"><path d="M7 1L1 7l6 6" stroke="#f3ecdc" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#5c5642' }}>Page {currentPage} of {totalPages}</div>
            <div onClick={() => setPage(Math.min(totalPages, currentPage + 1))} style={{ width: 36, height: 36, borderRadius: '50%', background: currentPage < totalPages ? '#33324a' : 'rgba(51,50,74,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="8" height="14" viewBox="0 0 8 14"><path d="M1 1l6 6-6 6" stroke="#f3ecdc" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

export default function JournalPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#efe6d3' }} />}>
      <JournalContent />
    </Suspense>
  )
}