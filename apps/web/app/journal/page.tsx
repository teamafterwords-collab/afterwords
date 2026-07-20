'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  getBooks, getEntriesForUser, saveQuote, saveNote, cleanupTranscript,
  generateChapterSummary, updateEntry,
  type Book, type Entry, type ChapterSummary,
} from '@/utils/supabase/queries'
import BottomNav from '@/components/BottomNav'

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

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return `${Math.floor(days / 30)} mo ago`
}

const estimateReadTime = (text: string) => {
  const words = text.trim().split(/\s+/).length
  const minutes = Math.max(1, Math.round(words / 100))
  return `${minutes} min`
}

function JournalContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [books, setBooks] = useState<Book[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const [detailEntry, setDetailEntry] = useState<Entry | null>(null)

  const [micListening, setMicListening] = useState(false)
  const [searchRecognition, setSearchRecognition] = useState<SpeechRecognitionLike | null>(null)

  const [addQuoteOpen, setAddQuoteOpen] = useState(false)
  const [addQuoteText, setAddQuoteText] = useState('')
  const [addQuotePage, setAddQuotePage] = useState('')
  const [addQuoteMic, setAddQuoteMic] = useState(false)
  const [addQuoteRecognition, setAddQuoteRecognition] = useState<SpeechRecognitionLike | null>(null)
  const [addQuoteSaving, setAddQuoteSaving] = useState(false)
  const [addMemoryType, setAddMemoryType] = useState<'quote' | 'note' | null>(null)

  const [expandedPrompts, setExpandedPrompts] = useState<Record<string, boolean>>({})

  const [chapterSummaries, setChapterSummaries] = useState<Record<string, ChapterSummary>>({})
  const chapterSummaryCache = useRef<Record<string, ChapterSummary | null>>({})

  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    async function load() {
      const [b, e] = await Promise.all([getBooks(), getEntriesForUser()])
      setBooks(b)
      setEntries(e)
      setLoading(false)

      const bookParam = searchParams.get('book')
      if (bookParam) setSelectedBookId(bookParam)
    }
    load()
  }, [searchParams])

  const isSearching = query.trim().length > 0
  const q = query.trim().toLowerCase()

  const booksWithStats = books
    .map((b) => {
      const bookEntries = entries.filter((e) => e.book_id === b.id)
      const reflections = bookEntries.filter((e) => e.kind === 'entry').length
      const quotes = bookEntries.filter((e) => e.kind === 'quote').length
      const lastActivity = bookEntries.length ? bookEntries.reduce((latest, e) => e.created_at > latest ? e.created_at : latest, bookEntries[0].created_at) : null
      return { book: b, reflections, quotes, lastActivity }
    })
    .filter((x) => x.reflections + x.quotes > 0)
    .sort((a, b) => (b.lastActivity || '').localeCompare(a.lastActivity || ''))

  const searchResults = isSearching
    ? entries.filter((e) => {
        const book = books.find((b) => b.id === e.book_id)
        const haystack = e.kind === 'quote' ? e.text ?? '' : `${e.question ?? ''} ${e.response ?? ''}`
        return haystack.toLowerCase().includes(q) || (book && book.title.toLowerCase().includes(q))
      }).sort((a, b) => b.created_at.localeCompare(a.created_at))
    : []

  const selectedBook = books.find((b) => b.id === selectedBookId)
  const selectedBookEntries = selectedBookId
    ? entries.filter((e) => e.book_id === selectedBookId).sort((a, b) => a.created_at.localeCompare(b.created_at))
    : []

  const groupedByChapter: { chapter: string; items: Entry[] }[] = []
  selectedBookEntries.forEach((e) => {
    const chapterLabel = e.chapter_range || 'General'
    const existing = groupedByChapter.find((g) => g.chapter === chapterLabel)
    if (existing) existing.items.push(e)
    else groupedByChapter.push({ chapter: chapterLabel, items: [e] })
  })

  useEffect(() => {
    if (!selectedBook) return
    groupedByChapter.forEach((group) => {
      if (group.chapter === 'General') return
      const key = `${selectedBook.id}-${group.chapter}`
      if (chapterSummaries[key] || chapterSummaryCache.current[key] !== undefined) return
      chapterSummaryCache.current[key] = null
      generateChapterSummary(selectedBook, group.chapter, group.items).then((result) => {
        chapterSummaryCache.current[key] = result
        if (result) setChapterSummaries((prev) => ({ ...prev, [key]: result }))
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBookId, entries])

  const startVoiceForSearch = () => {
    const SR = getSpeechRecognition()
    if (!SR) {
      alert('Voice input needs microphone access — try this on a deployed HTTPS site.')
      return
    }
    if (micListening && searchRecognition) {
      searchRecognition.stop()
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

  const submitNewMemory = async () => {
    if (!addQuoteText.trim() || !selectedBookId || !addMemoryType) return
    setAddQuoteSaving(true)
    if (addMemoryType === 'quote') {
      await saveQuote(selectedBookId, addQuoteText, addQuotePage)
    } else {
      await saveNote(selectedBookId, addQuoteText)
    }
    const freshEntries = await getEntriesForUser()
    setEntries(freshEntries)
    setAddQuoteText('')
    setAddQuotePage('')
    setAddMemoryType(null)
    setAddQuoteOpen(false)
    setAddQuoteSaving(false)
  }

  const startEditing = () => {
    if (!detailEntry) return
    setEditText((detailEntry.kind === 'quote' || detailEntry.kind === 'note') ? (detailEntry.text ?? '') : (detailEntry.response ?? ''))
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditText('')
  }

  const saveEdit = async () => {
    if (!detailEntry || !editText.trim()) return
    setSavingEdit(true)
    const updates = (detailEntry.kind === 'quote' || detailEntry.kind === 'note') ? { text: editText.trim() } : { response: editText.trim() }
    await updateEntry(detailEntry.id, updates)

    const freshEntries = await getEntriesForUser()
    setEntries(freshEntries)

    const updatedEntry = freshEntries.find((e) => e.id === detailEntry.id)
    setDetailEntry(updatedEntry || null)

    setIsEditing(false)
    setEditText('')
    setSavingEdit(false)
  }

  useEffect(() => {
    setIsEditing(false)
    setEditText('')
  }, [detailEntry?.id])

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#FAF9F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', fontFamily: 'Inter, sans-serif' }}>
      <style>{pulseKeyframes}</style>
      <div className="aw-container" style={{ width: '100%', margin: '0 auto', padding: '60px 22px 110px', boxSizing: 'border-box' }}>

        {!selectedBookId && (
          <>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 500, color: '#3A3A38', marginBottom: 16, marginTop: 4 }}>Journal</div>

            <div style={{ position: 'relative', marginBottom: 22 }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your reflections…"
                style={{ width: '100%', background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 12, padding: '12px 44px 12px 14px', fontSize: 14, color: '#3f3b2e', boxSizing: 'border-box' }}
              />
              <div
                onClick={startVoiceForSearch}
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
            </div>

            {isSearching ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {searchResults.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '30px 10px', fontSize: 13, color: '#8A8880' }}>No results found.</div>
                )}
                {searchResults.map((entry) => {
                  const isQuote = entry.kind === 'quote'
                  const book = books.find((b) => b.id === entry.book_id)
                  return (
                    <div key={entry.id} onClick={() => setDetailEntry(entry)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 12, padding: '12px 14px', cursor: 'pointer' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: isQuote ? 'Spectral, serif' : 'Fraunces, serif', fontStyle: isQuote ? 'italic' : 'normal', fontSize: isQuote ? 15 : 13.5, fontWeight: isQuote ? 400 : 600, color: '#3A3A38', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {isQuote ? entry.text : entry.question}
                        </div>
                        <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', color: '#6B8F76', marginTop: 3 }}>{book?.title}</div>
                      </div>
                      <div style={{ fontSize: 10.5, color: '#8A8880', flexShrink: 0 }}>{new Date(entry.created_at).toLocaleDateString()}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {booksWithStats.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 10px', fontSize: 13.5, color: '#8A8880' }}>No reflections yet — mark a chapter as read to start one.</div>
                )}
                {booksWithStats.map(({ book, reflections, quotes, lastActivity }) => (
                  <div
                    key={book.id}
                    onClick={() => setSelectedBookId(book.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 14, padding: 16, cursor: 'pointer' }}
                  >
                    <div
                      style={{
                        width: 48, height: 66, borderRadius: 5, flexShrink: 0,
                        backgroundColor: book.cover_url ? '#e8e2d0' : (book.cover_color ?? '#3b3a5c'),
                        backgroundImage: book.cover_url ? `url(${book.cover_url})` : undefined,
                        backgroundSize: 'cover', backgroundPosition: 'center',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 600, color: '#3A3A38', marginBottom: 4 }}>{book.title}</div>
                      <div style={{ fontSize: 12, color: '#5c5642', marginBottom: 3 }}>
                        {reflections} reflection{reflections === 1 ? '' : 's'} · {quotes} saved quote{quotes === 1 ? '' : 's'}
                      </div>
                      <div style={{ fontSize: 11, color: '#8A8880' }}>Last opened {lastActivity ? timeAgo(lastActivity) : '—'}</div>
                    </div>
                    <div style={{ fontSize: 16, color: '#8A8880', flexShrink: 0 }}>→</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {selectedBookId && selectedBook && (
          <>
            <div onClick={() => setSelectedBookId(null)} style={{ fontSize: 13, color: '#8A8880', cursor: 'pointer', marginBottom: 16, marginTop: 4 }}>← All books</div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 22 }}>
              <div
                style={{
                  width: 46, height: 64, borderRadius: 5, flexShrink: 0,
                  backgroundColor: selectedBook.cover_url ? '#e8e2d0' : (selectedBook.cover_color ?? '#3b3a5c'),
                  backgroundImage: selectedBook.cover_url ? `url(${selectedBook.cover_url})` : undefined,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                }}
              />
              <div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 600, color: '#3A3A38' }}>{selectedBook.title}</div>
                <div style={{ fontSize: 12.5, color: '#8A8880' }}>{selectedBook.author}</div>
                {selectedBook.status === 'finished' && (
                  <div onClick={() => router.push(`/checkin/${selectedBook.id}?mode=review`)} style={{ fontSize: 11.5, fontWeight: 600, color: '#6B8F76', marginTop: 4, cursor: 'pointer' }}>
                    Revisit this book →
                  </div>
                )}
              </div>
            </div>

            {!addQuoteOpen ? (
              <div
                onClick={() => setAddQuoteOpen(true)}
                style={{ textAlign: 'center', border: '1.5px dashed rgba(58,58,56,0.25)', borderRadius: 12, padding: 14, fontSize: 13, fontWeight: 500, color: '#5c5642', cursor: 'pointer', marginBottom: 20 }}
              >
                ＋ Add Memory
              </div>
            ) : !addMemoryType ? (
              <div style={{ background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#3A3A38', marginBottom: 12 }}>What kind of memory?</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  <div
                    onClick={() => setAddMemoryType('quote')}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FAF9F6', border: '1px solid rgba(58,58,56,0.1)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: 16 }}>📖</span>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#3A3A38' }}>Favorite Quote</div>
                      <div style={{ fontSize: 11.5, color: '#8A8880' }}>A line from the book itself</div>
                    </div>
                  </div>
                  <div
                    onClick={() => setAddMemoryType('note')}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FAF9F6', border: '1px solid rgba(58,58,56,0.1)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: 16 }}>💭</span>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#3A3A38' }}>A Realization</div>
                      <div style={{ fontSize: 11.5, color: '#8A8880' }}>Your own thought, not from the book</div>
                    </div>
                  </div>
                </div>
                <div onClick={() => setAddQuoteOpen(false)} style={{ textAlign: 'center', fontSize: 12.5, color: '#8A8880', cursor: 'pointer' }}>Cancel</div>
              </div>
            ) : (
              <div style={{ background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6B8F76', marginBottom: 10 }}>
                  {addMemoryType === 'quote' ? '📖 Favorite Quote' : '💭 A Realization'}
                </div>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <textarea
                    value={addQuoteText}
                    onChange={(e) => setAddQuoteText(e.target.value)}
                    placeholder={addMemoryType === 'quote' ? 'Type or speak the line…' : 'What did you realize?'}
                    autoFocus
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
                </div>
                {addMemoryType === 'quote' && (
                  <input
                    value={addQuotePage}
                    onChange={(e) => setAddQuotePage(e.target.value)}
                    placeholder="Page (optional)"
                    style={{ width: '100%', background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#3A3A38', marginBottom: 12, boxSizing: 'border-box' }}
                  />
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <div onClick={() => { setAddMemoryType(null); setAddQuoteText(''); setAddQuotePage('') }} style={{ flex: 1, textAlign: 'center', border: '1.5px solid rgba(58,58,56,0.2)', borderRadius: 100, padding: 10, fontSize: 13, fontWeight: 600, color: '#3A3A38', cursor: 'pointer' }}>
                    Back
                  </div>
                  <div onClick={submitNewMemory} style={{ flex: 1, textAlign: 'center', background: '#3A3A38', color: '#f3ecdc', fontWeight: 600, fontSize: 13, padding: 10, borderRadius: 100, cursor: 'pointer' }}>
                    {addQuoteSaving ? 'Saving…' : 'Save'}
                  </div>
                </div>
              </div>
            )}

            {groupedByChapter.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 10px', fontSize: 13, color: '#8A8880' }}>No reflections yet for this book.</div>
            )}

            {groupedByChapter.map((group) => {
              const summaryKey = selectedBook ? `${selectedBook.id}-${group.chapter}` : ''
              const summary = chapterSummaries[summaryKey]
              const reflectionCount = group.items.filter((e) => e.kind === 'entry' && e.question_type !== 'mc').length
              const quizCount = group.items.filter((e) => e.question_type === 'mc').length
              const quoteCount = group.items.filter((e) => e.kind === 'quote').length

              return (
              <div key={group.chapter} style={{ marginBottom: 26 }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6B8F76', marginBottom: 4 }}>{group.chapter}</div>
                  {summary && (
                    <>
                      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 600, color: '#3A3A38', marginBottom: 6 }}>
                        {summary.headline}
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.55, color: '#4a4636', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, color: '#6B8F76' }}>Your takeaway: </span>{summary.takeaway}
                      </div>
                    </>
                  )}
                  <div style={{ fontSize: 11, color: '#8A8880' }}>
                    {[
                      reflectionCount > 0 ? `${reflectionCount} reflection${reflectionCount === 1 ? '' : 's'}` : null,
                      quizCount > 0 ? `${quizCount} quiz${quizCount === 1 ? '' : 'zes'}` : null,
                      quoteCount > 0 ? `${quoteCount} saved quote${quoteCount === 1 ? '' : 's'}` : null,
                    ].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div style={{ position: 'relative', paddingLeft: 20 }}>
                  <div style={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 2, background: 'rgba(58,58,56,0.1)' }} />
                  {group.items.map((entry, i) => {
                    const isQuote = entry.kind === 'quote'
                    const isNote = entry.kind === 'note'
                    const isMC = entry.question_type === 'mc'
                    const promptExpanded = !!expandedPrompts[entry.id]
                    const promptFirstLine = entry.question ? entry.question.split(/(?<=[.?!])\s/)[0] : ''
                    const promptHasMore = entry.question ? entry.question.length > promptFirstLine.length : false

                    const dotColor = isQuote ? '#6B8F76' : isMC ? '#B8935A' : isNote ? '#8A8880' : '#3A3A38'
                    const cardBg = isMC ? '#F5EEE0' : isQuote ? 'transparent' : '#F3F1EC'
                    const cardBorder = isMC ? 'rgba(184,147,90,0.25)' : isQuote ? 'transparent' : 'rgba(58,58,56,0.08)'
                    const cardPadding = isQuote ? '10px 4px' : '14px 16px'

                    return (
                      <div key={entry.id} style={{ position: 'relative', marginBottom: i < group.items.length - 1 ? 14 : 0 }}>
                        <div style={{ position: 'absolute', left: -20, top: 4, width: 10, height: 10, borderRadius: '50%', background: dotColor, border: '2px solid #FAF9F6' }} />
                        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: cardPadding }}>

                          {isQuote && (
                            <>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#6B8F76', marginBottom: 10 }}>📖 Favorite quote</div>
                              <div onClick={() => setDetailEntry(entry)} style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 19, lineHeight: 1.5, color: '#3A3A38', cursor: 'pointer' }}>
                                &quot;{entry.text}&quot;
                              </div>
                            </>
                          )}

                          {isNote && (
                            <>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#3A3A38', marginBottom: 8 }}>💭 A realization</div>
                              <div onClick={() => setDetailEntry(entry)} style={{ fontSize: 14.5, lineHeight: 1.5, color: '#3A3A38', cursor: 'pointer' }}>
                                {entry.text}
                              </div>
                            </>
                          )}

                          {!isQuote && !isNote && isMC && (
                            <>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#B8935A', marginBottom: 8 }}>✅ Quiz</div>
                              <div onClick={() => setDetailEntry(entry)} style={{ fontFamily: 'Fraunces, serif', fontSize: 14, fontWeight: 600, color: '#3A3A38', marginBottom: 4, cursor: 'pointer' }}>
                                {entry.response}
                              </div>
                              <div style={{ fontSize: 11.5, color: '#6B8F76', fontWeight: 600 }}>Answered ✓</div>
                            </>
                          )}

                          {!isQuote && !isNote && !isMC && (
                            <>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#3A3A38', marginBottom: 8 }}>💭 Your reflection</div>
                              <div onClick={() => setDetailEntry(entry)} style={{ fontSize: 14.5, lineHeight: 1.5, color: '#3A3A38', marginBottom: 10, cursor: 'pointer' }}>
                                {entry.response}
                              </div>
                              <div style={{ fontSize: 11, color: '#8A8880', marginBottom: promptHasMore ? 3 : 0 }}>
                                {promptExpanded ? (
                                  <>
                                    <span style={{ fontWeight: 600 }}>Prompt: </span>{entry.question}
                                  </>
                                ) : (
                                  <>
                                    <span style={{ fontWeight: 600 }}>Prompt: </span>{promptFirstLine}
                                  </>
                                )}
                              </div>
                              {promptHasMore && (
                                <div
                                  onClick={(e) => { e.stopPropagation(); setExpandedPrompts((prev) => ({ ...prev, [entry.id]: !prev[entry.id] })) }}
                                  style={{ fontSize: 11, fontWeight: 600, color: '#6B8F76', cursor: 'pointer' }}
                                >
                                  {promptExpanded ? '▲ Hide full question' : '▼ View full question'}
                                </div>
                              )}
                            </>
                          )}

                          <div style={{ display: 'flex', gap: 8, fontSize: 10.5, color: '#8A8880', marginTop: 12, paddingTop: 10, borderTop: `1px solid ${isQuote ? 'rgba(58,58,56,0.08)' : isMC ? 'rgba(184,147,90,0.2)' : 'rgba(58,58,56,0.06)'}` }}>
                            {entry.response && !isQuote && <span>{estimateReadTime(entry.response)}</span>}
                            {entry.response && !isQuote && <span>·</span>}
                            <span>{new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              )
            })}
          </>
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

            {(detailEntry.kind === 'quote' || detailEntry.kind === 'note') ? (
              <>
                {!isEditing ? (
                  <div onClick={startEditing} style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 22, lineHeight: 1.5, color: '#3A3A38', marginBottom: 14, cursor: 'pointer' }}>
                    &quot;{detailEntry.text}&quot;
                  </div>
                ) : (
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    autoFocus
                    style={{ width: '100%', minHeight: 100, fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 18, lineHeight: 1.5, color: '#3A3A38', background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.14)', borderRadius: 10, padding: 12, marginBottom: 14, boxSizing: 'border-box', resize: 'vertical' }}
                  />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: '#8A8880' }}>
                    saved line{detailEntry.chapter_range ? ` · ${detailEntry.chapter_range}` : ''} · {new Date(detailEntry.created_at).toLocaleDateString()}
                  </div>
                  {!isEditing ? (
                    <div onClick={startEditing} style={{ fontSize: 12, fontWeight: 600, color: '#6B8F76', cursor: 'pointer' }}>✏ Edit</div>
                  ) : (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div onClick={cancelEditing} style={{ fontSize: 12, fontWeight: 600, color: '#8A8880', cursor: 'pointer' }}>Cancel</div>
                      <div onClick={saveEdit} style={{ fontSize: 12, fontWeight: 600, color: '#6B8F76', cursor: 'pointer' }}>{savingEdit ? 'Saving…' : 'Save'}</div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 11, color: '#8A8880', marginBottom: 6 }}>{detailEntry.chapter_range} · {new Date(detailEntry.created_at).toLocaleDateString()}</div>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 600, color: '#3A3A38', marginBottom: 12, lineHeight: 1.4 }}>
                  {detailEntry.question}
                </div>

                {detailEntry.question_type === 'mc' ? (
                  <div style={{ fontSize: 15, lineHeight: 1.65, color: '#4a4636' }}>
                    {detailEntry.response}
                  </div>
                ) : (
                  <>
                    {!isEditing ? (
                      <div onClick={startEditing} style={{ fontSize: 15, lineHeight: 1.65, color: '#4a4636', marginBottom: 14, cursor: 'pointer' }}>
                        {detailEntry.response}
                      </div>
                    ) : (
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        autoFocus
                        style={{ width: '100%', minHeight: 120, fontSize: 14, lineHeight: 1.6, color: '#3A3A38', background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.14)', borderRadius: 10, padding: 12, marginBottom: 14, boxSizing: 'border-box', resize: 'vertical' }}
                      />
                    )}
                    <div style={{ textAlign: 'right' }}>
                      {!isEditing ? (
                        <div onClick={startEditing} style={{ fontSize: 12, fontWeight: 600, color: '#6B8F76', cursor: 'pointer', display: 'inline-block' }}>✏ Edit</div>
                      ) : (
                        <div style={{ display: 'inline-flex', gap: 10 }}>
                          <div onClick={cancelEditing} style={{ fontSize: 12, fontWeight: 600, color: '#8A8880', cursor: 'pointer' }}>Cancel</div>
                          <div onClick={saveEdit} style={{ fontSize: 12, fontWeight: 600, color: '#6B8F76', cursor: 'pointer' }}>{savingEdit ? 'Saving…' : 'Save'}</div>
                        </div>
                      )}
                    </div>
                  </>
                )}
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
