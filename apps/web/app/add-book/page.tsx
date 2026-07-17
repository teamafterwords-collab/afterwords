'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { addBook, fetchTitleSuggestions, type TitleSuggestion } from '@/utils/supabase/queries'

const COVER_COLORS = ['#3b3a5c', '#4b5d45', '#7c4a3a', '#8a6a3d', '#2f4858', '#5c4033']

type TrackingMode = 'chapter' | 'page'
type Status = 'want_to_read' | 'currently_reading' | 'finished'

export default function AddBookPage() {
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [genre, setGenre] = useState('')
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('chapter')
  const [total, setTotal] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [status, setStatus] = useState<Status>('want_to_read')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [suggestions, setSuggestions] = useState<TitleSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggestCache = useRef<Record<string, TitleSuggestion[]>>({})

  const isValid = title.trim() && author.trim() && total.trim()

  const handleTitleChange = (val: string) => {
    setTitle(val)
    setSuggestions([])
    setShowSuggestions(false)

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
    }, 300)
  }

  const pickSuggestion = (s: TitleSuggestion) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setTitle(s.title)
    setAuthor(s.author)
    setGenre(s.genre)
    setTrackingMode(s.trackingMode)
    setTotal(String(s.trackingMode === 'page' ? s.totalPages ?? '' : s.totalChapters ?? ''))
    setCoverUrl(s.coverUrl)
    setSuggestions([])
    setShowSuggestions(false)
  }

  const handleSubmit = async () => {
    if (!isValid) return
    setSaving(true)
    setError(null)

    const totalNum = Math.max(1, parseInt(total, 10) || 1)
    const finalCoverColor = COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)]

    const result = await addBook({
      title: title.trim(),
      author: author.trim(),
      genre: genre.trim(),
      tracking_mode: trackingMode,
      total_chapters: trackingMode === 'chapter' ? totalNum : null,
      total_pages: trackingMode === 'page' ? totalNum : null,
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
    <div style={{ minHeight: '100vh', background: '#efe6d3', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '60px 22px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div onClick={() => router.push('/home')} style={{ fontSize: 20, color: '#33324a', cursor: 'pointer' }}>←</div>
          <div style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 700, color: '#33324a' }}>Add a book</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#5c5642', marginBottom: 6 }}>Title</div>
          <div style={{ position: 'relative' }}>
            <input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              style={inputStyle}
            />
            {suggestLoading && (
              <div style={{ position: 'absolute', right: 14, top: 14, fontSize: 12, color: '#8d8570' }}>…</div>
            )}
            {showSuggestions && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fbf6ec', border: '1px solid rgba(51,50,74,0.14)', borderRadius: 10, boxShadow: '0 8px 20px rgba(0,0,0,0.12)', zIndex: 30, overflow: 'hidden' }}>
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => pickSuggestion(s)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid rgba(51,50,74,0.08)' : 'none' }}
                  >
                    <div style={{ width: 30, height: 42, borderRadius: 3, backgroundColor: '#d9d0bc', backgroundImage: s.coverUrl ? `url(${s.coverUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }} />
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#33324a' }}>{s.title}</div>
                      <div style={{ fontSize: 12, color: '#8d8570', marginTop: 1 }}>{s.author}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Field label="Author">
          <input value={author} onChange={(e) => setAuthor(e.target.value)} onFocus={() => setShowSuggestions(false)} style={inputStyle} />
        </Field>

        <Field label="Genre">
          <input value={genre} onChange={(e) => setGenre(e.target.value)} style={inputStyle} />
        </Field>

        <div style={{ fontSize: 12, fontWeight: 600, color: '#5c5642', marginBottom: 6 }}>Track by</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {(['chapter', 'page'] as TrackingMode[]).map((m) => (
            <div
              key={m}
              onClick={() => setTrackingMode(m)}
              style={{
                flex: 1, textAlign: 'center', padding: '10px 4px', borderRadius: 10, fontSize: 12.5, cursor: 'pointer',
                background: trackingMode === m ? '#33324a' : '#fbf6ec',
                color: trackingMode === m ? '#f3ecdc' : '#5c5642',
                border: '1px solid rgba(51,50,74,0.14)',
              }}
            >
              {m === 'chapter' ? 'Chapters' : 'Pages'}
            </div>
          ))}
        </div>

        <Field label={trackingMode === 'page' ? 'Total pages' : 'Total chapters'}>
          <input type="number" value={total} onChange={(e) => setTotal(e.target.value)} style={inputStyle} />
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
                background: status === s.id ? '#33324a' : '#fbf6ec',
                color: status === s.id ? '#f3ecdc' : '#5c5642',
                border: '1px solid rgba(51,50,74,0.14)',
              }}
            >
              {s.label}
            </div>
          ))}
        </div>

        {error && <div style={{ color: '#a03', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <button
          onClick={handleSubmit}
          disabled={!isValid || saving}
          style={{
            width: '100%', textAlign: 'center', background: isValid ? '#33324a' : 'rgba(51,50,74,0.3)',
            color: '#f3ecdc', fontWeight: 600, fontSize: 15, padding: 15, borderRadius: 100, border: 'none',
            cursor: isValid ? 'pointer' : 'default',
          }}
        >
          {saving ? 'Adding…' : 'Add to shelf'}
        </button>
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
  width: '100%', background: '#fbf6ec', border: '1px solid rgba(51,50,74,0.14)', borderRadius: 10,
  padding: '12px 14px', fontSize: 14, color: '#3f3b2e', boxSizing: 'border-box',
}