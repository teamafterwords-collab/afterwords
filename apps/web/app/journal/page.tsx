'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  getBooks, getEntriesForUser, saveQuote, cleanupTranscript,
  type Book, type Entry,
} from '@/utils/supabase/queries'
import BottomNav from '@/components/BottomNav'

const PAGE_SIZE = 10

type SpeechRecognitionResultLike = { transcript: string }
interface SpeechRecognitionLike extends EventTarget {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  onresult: ((e: { results: { 0: { 0: SpeechRecognitionResultLike } } }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

const pulseKeyframes = `
@keyframes mic-pulse {
  0% { box-shadow: 0 0 0 0 rgba(107,143,118,0.5); }
  70% { box-shadow: 0 0 0 10px rgba(107,143,118,0); }
  100% { box-shadow: 0 0 0 0 rgba(107,143,118,0); }
}
`

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

  const [detailEntry, setDetailEntry] = useState<Entry | null>(null)

  const [micListening, setMicListening] = useState(false)
  const [searchRecognition, setSearchRecognition] = useState<SpeechRecognitionLike | null>(null)

  const [addQuoteOpen, setAddQuoteOpen] = useState(false)
  const [addQuoteText, setAddQuoteText] = useState('')
  const [addQuotePage, setAddQuotePage] = useState('')
  const [addQuoteMic, setAddQuoteMic] = useState(false)
  const [addQuoteRecognition, setAddQuoteRecognition] = useState<SpeechRecognitionLike | null>(null)
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

  const toggleVoiceForSearch = () => {
    if (micListening && searchRecognition) {
      searchRecognition.stop()
      return
    }
    const SR = getSpeechRecognition()
    if (!SR) {
      alert('Voice input needs microphone access — try this on a deployed HTTPS site.')
      return
    }
    const recog = new SR()
    recog.lang = 'en-US'
    recog.continuous = true
    recog.interimResults = false
    setMicListening(true)
    setSearchRecognition(recog)
    recog.onresult = async (e) => {
      const transcript = e.results[0][0].transcript
      const cleaned = await cleanupTranscript(transcript)
      setQuery((prev) => (prev ? prev + ' ' + cleaned : cleaned))
      setPage(1)
    }
    recog.onerror = () => { setMicListening(false); setSearchRecognition(null) }
    recog.onend = () => { setMicListening(false); setSearchRecognition(null) }
    recog.start()
  }

  const toggleVoiceForAddQuote = () => {
    if (addQuoteMic && addQuoteRecognition) {
      addQuoteRecognition.stop()
      return
    }
    const SR = getSpeechRecognition()
    if (!SR) {
      alert('Voice input needs microphone access — try this on a deployed HTTPS site.')
      return
    }
    const recog = new SR()
    recog.lang = 'en-US'
    recog.continuous = true
    recog.interimResults = false
    setAddQuoteMic(true)
    setAddQuoteRecognition(recog)
    recog.onresult = async (e) => {
      const transcript = e.results[0][0].transcript
      const cleaned = await cleanupTranscript(transcript)
      setAddQuoteText((prev) => (prev ? prev.trim() + ' ' + cleaned : cleaned))
    }
    recog.onerror = () => { setAddQuoteMic(false); setAddQuoteRecognition(null) }
    recog.onend = () => { setAddQuoteMic(false); setAddQuoteRecognition(null) }
    recog.start()
  }

  const submitNewQuote = async () => {
    if (!addQuoteText.trim() || !selectedBookId) return
    setAddQuoteSaving(true)
    await saveQuote(selectedBookId, addQuoteText, addQuotePage)
    const freshEntries = await getEntriesForUser()
    setEntries(freshEntries)
    setAddQuoteText('')
    setAddQuotePage('')
    setAddQuoteOpen(false)
    setAddQuoteSaving(false)
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#FAF9F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', fontFamily: 'Inter, sans-serif' }}>
      <style>{pulseKeyframes}</style>
      <div style={{ maxWidth: 560, width: '100%', margin: '0 auto', padding: '60px 22px 110px' }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 500, color: '#3A3A38', marginBottom: 16, marginTop: 4 }}>Journal</div>

        <div style={{ position: 'relative', marginBottom: 18 }}>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
            placeholder="Search your reflections…"
            style={{ width: '100%', background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 12, padding: '12px 44px 12px 14px', fontSize: 14, color: '#3f3b2e', boxSizing: 'border-box' }}
          />
          <div
            onClick={toggleVoiceForSearch}
            style={{
              position: 'absolute', right: 8, top: 6, width: 32, height: 32, borderRadius: '50%',
              background: micListening ? '#6B8F76' : '#3A3A38', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              animation: micListening ? 'mic-pulse 1.4s infinite' : 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="4.5" y="0.5" width="5" height="8" rx="2.5" fill="#f3ecdc" />
              <path d="M2 6.5C2 9.26 4.24 11.5 7 11.5C9.76 11.5 12 9.26 12 6.5" stroke="#f3ecdc" strokeWidth="1.3" strokeLinecap="round" />
              <line x1="7" y1="11.5" x2="7" y2="13.5" stroke="#f3ecdc" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </div>
          {micListening && (
            <div style={{ position: 'absolute', right: 8, top: 44, fontSize: 11, fontWeight: 600, color: '#6B8F76' }}>
              Listening… tap to stop
            </div>
          )}
        </div>

        {genres.length > 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 2 }}>
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
                    background: '#F3F1EC', border: `1.5px solid ${sel ? '#3A3A38' : 'rgba(58,58,56,0.08)'}`,
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
              <div style={{ background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <textarea
                    value={addQuoteText}
                    onChange={(e) => setAddQuoteText(e.target.value)}
                    placeholder="Type or speak the line…"
                    style={{ width: '100%', minHeight: 90, background: '#FAF9F6', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 10, padding: '12px 44px 12px 12px', fontSize: 14, lineHeight: 1.5, color: '#3f3b2e', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                  <div
                    onClick={toggleVoiceForAddQuote}
                    style={{
                      position: 'absolute', right: 10, top: 10, width: 28, height: 28, borderRadius: '50%',
                      background: addQuoteMic ? '#6B8F76' : '#3A3A38', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      animation: addQuoteMic ? 'mic-pulse 1.4s infinite' : 'none',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                      <rect x="4.5" y="0.5" width="5" height="8" rx="2.5" fill="#f3ecdc" />
                      <path d="M2 6.5C2 9.26 4.24 11.5 7 11.5C9.76 11.5 12 9.26 12 6.5" stroke="#f3ecdc" strokeWidth="1.3" strokeLinecap="round" />
                      <line x1="7" y1="11.5" x2="7" y2="13.5" stroke="#f3ecdc" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  </div>
                  {addQuoteMic && (
                    <div style={{ position: 'absolute', right: 10, top: 48, fontSize: 11, fontWeight: 600, color: '#6B8F76' }}>
                      Listening… tap to stop
                    </div>
                  )}
                </div>
                <input
                  value={addQuotePage}
                  onChange={(e) => setAddQuotePage(e.target.value)}
                  placeholder="Page (optional)"
                  style={{ width: '100%', background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#3A3A38', marginBottom: 12, boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <div onClick={() => { setAddQuoteOpen(false); setAddQuoteText(''); setAddQuotePage('') }} style={{ flex: 1, textAlign: 'center', border: '1.5px solid rgba(51,50,74,0.2)', borderRadius: 100, padding: 10, fontSize: 13, fontWeight: 600, color: '#3A3A38', cursor: 'pointer' }}>
                    Cancel
                  </div>
                  <div onClick={submitNewQuote} style={{ flex: 1, textAlign: 'center', background: '#3A3A38', color: '#f3ecdc', fontWeight: 600, fontSize: 13, padding: 10, borderRadius: 100, cursor: 'pointer' }}>
                    {addQuoteSaving ? 'Saving…' : 'Save'}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {pagedEntries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 10px', fontSize: 13, color: '#8A8880' }}>
            No reflections yet — mark a chapter as read to start one.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pagedEntries.map((entry) => {
            const isQuote = entry.kind === 'quote'
            const book = books.find((b) => b.id === entry.book_id)

            if (isQuote) {
              return (
                <div
                  key={entry.id}
                  onClick={() => setDetailEntry(entry)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 12, padding: '12px 14px', cursor: 'pointer' }}
                >
                  <div style={{ fontSize: 14, flexShrink: 0 }}>❝</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Spectral, serif', fontSize: 16, color: '#3A3A38', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.text}
                    </div>
                    {isSearching && <div style={{ fontSize: 10.5, color: '#8A8880', marginTop: 1 }}>{book?.title}</div>}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#8A8880', flexShrink: 0, textAlign: 'right' }}>
                    {entry.chapter_range && <div>{entry.chapter_range}</div>}
                    <div>{new Date(entry.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={entry.id}
                onClick={() => setDetailEntry(entry)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 12, padding: '12px 14px', cursor: 'pointer' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Fraunces, serif', fontSize: 13.5, fontWeight: 600, color: '#3A3A38', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.question}
                  </div>
                  <div style={{ fontSize: 12, color: '#8A8880', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.response}
                  </div>
                  {isSearching && <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', color: '#6B8F76', marginTop: 3 }}>{book?.title}</div>}
                </div>
                <div style={{ fontSize: 10.5, color: '#8A8880', flexShrink: 0, textAlign: 'right' }}>
                  <div>{entry.chapter_range}</div>
                  <div>{new Date(entry.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            )
          })}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 20 }}>
            <div onClick={() => setPage(Math.max(1, currentPage - 1))} style={{ width: 36, height: 36, borderRadius: '50%', background: currentPage > 1 ? '#3A3A38' : 'rgba(51,50,74,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="8" height="14" viewBox="0 0 8 14"><path d="M7 1L1 7l6 6" stroke="#f3ecdc" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#5c5642' }}>Page {currentPage} of {totalPages}</div>
            <div onClick={() => setPage(Math.min(totalPages, currentPage + 1))} style={{ width: 36, height: 36, borderRadius: '50%', background: currentPage < totalPages ? '#3A3A38' : 'rgba(51,50,74,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="8" height="14" viewBox="0 0 8 14"><path d="M1 1l6 6-6 6" stroke="#f3ecdc" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </div>
        )}
      </div>

      {detailEntry && (
        <div
          onClick={() => setDetailEntry(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(58,58,56,0.4)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#FAF9F6', width: '100%', maxWidth: 480, borderRadius: 20, padding: '26px 24px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)', maxHeight: '80vh', overflowY: 'auto', boxSizing: 'border-box' }}
          >
            <div onClick={() => setDetailEntry(null)} style={{ textAlign: 'right', fontSize: 20, color: '#8A8880', cursor: 'pointer', marginBottom: 10 }}>✕</div>

            {detailEntry.kind === 'quote' ? (
              <>
                <div style={{ fontFamily: 'Spectral, serif', fontSize: 22, lineHeight: 1.5, color: '#3A3A38', marginBottom: 14 }}>
                  &quot;{detailEntry.text}&quot;
                </div>
                <div style={{ fontSize: 12, color: '#8A8880' }}>
                  saved line{detailEntry.chapter_range ? ` · ${detailEntry.chapter_range}` : ''} · {new Date(detailEntry.created_at).toLocaleDateString()}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 11, color: '#8A8880', marginBottom: 6 }}>{detailEntry.chapter_range} · {new Date(detailEntry.created_at).toLocaleDateString()}</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 600, color: '#3A3A38', marginBottom: 12, lineHeight: 1.4 }}>
                  {detailEntry.question}
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.65, color: '#4a4636' }}>
                  {detailEntry.response}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default function JournalPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FAF9F6' }} />}>
      <JournalContent />
    </Suspense>
  )
}