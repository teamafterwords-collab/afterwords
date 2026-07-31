'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { addBook, fetchTitleSuggestions, type TitleSuggestion } from '@/utils/supabase/queries'

const COVER_COLORS = ['#3b3a5c', '#4b5d45', '#7c4a3a', '#8a6a3d', '#2f4858', '#5c4033']

type Status = 'want_to_read' | 'currently_reading' | 'finished'

export default function AddBookPage() {
  const router = useRouter()

  const [showManualForm, setShowManualForm] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<TitleSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggestCache = useRef<Record<string, TitleSuggestion[]>>({})

  const [selectedBook, setSelectedBook] = useState<TitleSuggestion | null>(null)
  const [quickAddPages, setQuickAddPages] = useState('')
  const [status, setStatus] = useState<Status>('currently_reading')

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [genre, setGenre] = useState('')
  const [totalPages, setTotalPages] = useState('')
  const [coverUrl, setCoverUrl] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setSuggestions([])
    setShowSuggestions(false)
    setSelectedBook(null)
    setQuickAddPages('')

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 3) return

    debounceRef.current = setTimeout(async () => {
      if (suggestCache.current[val]) {
        setSuggestions(suggestCache.current[val])
        setShowSuggestions(suggestCache.current[val].length > 0)
        return
      }
      setSuggestLoading(true)
      const results = await fetchTitleSuggestions(val)
      suggestCache.current[val] = results
      setSuggestions(results)
      setShowSuggestions(results.length > 0)
      setSuggestLoading(false)
    }, 200)
  }

  const pickSuggestion = (s: TitleSuggestion) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSelectedBook(s)
    setSearchQuery(s.title)
    setSuggestions([])
    setShowSuggestions(false)
    setQuickAddPages(s.totalPages && s.totalPages > 10 ? String(s.totalPages) : '')
  }

  const isQuickAddValid = parseInt(quickAddPages, 10) > 0

  const handleQuickAdd = async () => {
    if (!selectedBook || !isQuickAddValid) return
    setSaving(true)
    setError(null)

    const finalCoverColor = COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)]
    const totalNum = parseInt(quickAddPages, 10)

    const result = await addBook({
      title: selectedBook.title,
      author: selectedBook.author,
      genre: selectedBook.genre,
      tracking_mode: 'page',
      total_chapters: null,
      total_pages: totalNum,
      status,
      cover_color: finalCoverColor,
      cover_url: selectedBook.coverUrl,
    })

    if (result.error) {
      setError(result.error)
      setSaving(false)
      return
    }

    router.push('/home')
    router.refresh()
  }

  const isManualValid = title.trim() && author.trim() && totalPages.trim()

  const handleManualAdd = async () => {
    if (!isManualValid) return
    setSaving(true)
    setError(null)

    const totalNum = Math.max(1, parseInt(totalPages, 10) || 1)
    const finalCoverColor = COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)]

    const result = await addBook({
      title: title.trim(),
      author: author.trim(),
      genre: genre.trim(),
      tracking_mode: 'page',
      total_chapters: null,
      total_pages: totalNum,
      status,
      cover_color: finalCoverColor,
      cover_url: coverUrl,
    })

    if (result.error) {
      setError(result.error)
      setSaving(false)
      return
    }

    router.push('/home')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ maxWidth: 480, width: '100%', margin: '0 auto', padding: '60px 22px 40px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div onClick={() => router.push('/home')} style={{ fontSize: 20, color: '#3A3A38', cursor: 'pointer' }}>←</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 600, color: '#3A3A38' }}>Add a book</div>
        </div>

        {!showManualForm ? (
          <>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <input
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by title, author, or ISBN"
                autoFocus
                style={{ ...inputStyle, paddingLeft: 40 }}
              />
              <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#8A8880' }}>🔍</div>
              {suggestLoading && (
                <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: '2px solid rgba(58,58,56,0.15)', borderTopColor: '#6B8F76',
                    animation: 'spin 0.6s linear infinite',
                  }} />
                </div>
              )}

              {suggestLoading && !showSuggestions && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 10, padding: '14px', textAlign: 'center', zIndex: 30 }}>
                  <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 13, color: '#6B8F76' }}>Searching for your book…</div>
                </div>
              )}

              {showSuggestions && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 10, boxShadow: '0 8px 20px rgba(0,0,0,0.12)', zIndex: 30, overflow: 'hidden' }}>
                  {suggestions.map((s, i) => (
                    <div
                      key={i}
                      onClick={() => pickSuggestion(s)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid rgba(58,58,56,0.06)' : 'none' }}
                    >
                      <div style={{ width: 30, height: 42, borderRadius: 3, backgroundColor: '#e8e2d0', backgroundImage: s.coverUrl ? `url(${s.coverUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }} />
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#3A3A38' }}>{s.title}</div>
                        <div style={{ fontSize: 12, color: '#8A8880', marginTop: 1 }}>{s.author}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!selectedBook && (
              <div onClick={() => setShowManualForm(true)} style={{ textAlign: 'center', fontSize: 12.5, color: '#8A8880', cursor: 'pointer', marginBottom: 24 }}>
                Can&apos;t find your book? <span style={{ fontWeight: 600, color: '#6B8F76' }}>+ Add manually</span>
              </div>
            )}

            {selectedBook && (
              <>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 14, padding: 16, marginTop: 20, marginBottom: 24 }}>
                  <div style={{ width: 52, height: 74, borderRadius: 5, flexShrink: 0, backgroundColor: '#e8e2d0', backgroundImage: selectedBook.coverUrl ? `url(${selectedBook.coverUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 600, color: '#3A3A38' }}>{selectedBook.title}</div>
                    <div style={{ fontSize: 12.5, color: '#8A8880', marginTop: 2 }}>{selectedBook.author}</div>
                    {selectedBook.genre && <div style={{ fontSize: 11, color: '#6B8F76', marginTop: 3 }}>{selectedBook.genre}</div>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      <input
                        type="number"
                        value={quickAddPages}
                        onChange={(e) => setQuickAddPages(e.target.value)}
                        placeholder="Total pages"
                        style={{ width: 80, background: '#FAF9F6', border: '1px solid rgba(58,58,56,0.12)', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: '#3A3A38' }}
                      />
                      <span style={{ fontSize: 11, color: '#8A8880' }}>pages</span>
                    </div>
                    {(!selectedBook.totalPages || selectedBook.totalPages <= 10) && (
                      <div style={{ fontSize: 10.5, color: '#a06a3a', marginTop: 4 }}>We couldn&apos;t confirm the page count — please check it</div>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: 12, fontWeight: 600, color: '#5c5642', marginBottom: 6 }}>Shelf</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                  {([
                    { id: 'want_to_read', label: 'Want to Read' },
                    { id: 'currently_reading', label: 'Currently Reading' },
                    { id: 'finished', label: 'Finished' },
                  ] as { id: Status; label: string }[]).map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setStatus(s.id)}
                      style={{
                        flex: 1, textAlign: 'center', padding: '10px 4px', borderRadius: 10, fontSize: 11.5, cursor: 'pointer',
                        background: status === s.id ? '#3A3A38' : '#F3F1EC',
                        color: status === s.id ? '#FAF9F6' : '#5c5642',
                        border: '1px solid rgba(58,58,56,0.08)',
                      }}
                    >
                      {s.label}
                    </div>
                  ))}
                </div>

                {error && <div style={{ color: '#a03', fontSize: 13, marginBottom: 12 }}>{error}</div>}

                <button
                  onClick={handleQuickAdd}
                  disabled={saving || !isQuickAddValid}
                  style={{ width: '100%', textAlign: 'center', background: isQuickAddValid ? '#3A3A38' : 'rgba(58,58,56,0.3)', color: '#FAF9F6', fontWeight: 600, fontSize: 15, padding: 15, borderRadius: 100, border: 'none', cursor: isQuickAddValid ? 'pointer' : 'default', opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? 'Adding…' : 'Add Book'}
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <div onClick={() => setShowManualForm(false)} style={{ fontSize: 13, color: '#8A8880', cursor: 'pointer', marginBottom: 20 }}>← Back to search</div>

            <Field label="Title">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Atomic Habits" style={inputStyle} />
            </Field>
            <Field label="Author">
              <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. James Clear" style={inputStyle} />
            </Field>
            <Field label="Genre">
              <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g. Self-Help" style={inputStyle} />
            </Field>
            <Field label="Total pages">
              <input type="number" value={totalPages} onChange={(e) => setTotalPages(e.target.value)} placeholder="e.g. 320" style={inputStyle} />
            </Field>

            <div style={{ fontSize: 12, fontWeight: 600, color: '#5c5642', marginBottom: 6 }}>Shelf</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {([
                { id: 'want_to_read', label: 'Want to Read' },
                { id: 'currently_reading', label: 'Currently Reading' },
                { id: 'finished', label: 'Finished' },
              ] as { id: Status; label: string }[]).map((s) => (
                <div
                  key={s.id}
                  onClick={() => setStatus(s.id)}
                  style={{
                    flex: 1, textAlign: 'center', padding: '10px 4px', borderRadius: 10, fontSize: 11.5, cursor: 'pointer',
                    background: status === s.id ? '#3A3A38' : '#F3F1EC',
                    color: status === s.id ? '#FAF9F6' : '#5c5642',
                    border: '1px solid rgba(58,58,56,0.08)',
                  }}
                >
                  {s.label}
                </div>
              ))}
            </div>

            {error && <div style={{ color: '#a03', fontSize: 13, marginBottom: 12 }}>{error}</div>}

            <button
              onClick={handleManualAdd}
              disabled={!isManualValid || saving}
              style={{
                width: '100%', textAlign: 'center', background: isManualValid ? '#3A3A38' : 'rgba(58,58,56,0.3)',
                color: '#FAF9F6', fontWeight: 600, fontSize: 15, padding: 15, borderRadius: 100, border: 'none',
                cursor: isManualValid ? 'pointer' : 'default',
              }}
            >
              {saving ? 'Adding…' : 'Add to shelf'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#5c5642', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 10,
  padding: '12px 14px', fontSize: 14, color: '#3A3A38', boxSizing: 'border-box',
}
