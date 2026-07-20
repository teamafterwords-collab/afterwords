'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  type Book, type Question,
  generateCheckinQuestions, generateSingleQuestion, generateReplacementQuestion, generateReviewQuestions,
  getFollowUpQuestion, isReflectionShallow,
  saveCheckinEntries, updateBookProgress, incrementCheckinCount, saveQuote, cleanupTranscript,
  generateBookSummary, type BookSummaryResult,
} from '@/utils/supabase/queries'

type Phase = 'range' | 'loading' | 'questions' | 'quotePrompt' | 'error' | 'justFinished'

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

export default function CheckinPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CheckinContent />
    </Suspense>
  )
}

function CheckinContent() {
  const router = useRouter()
  const { bookId } = useParams<{ bookId: string }>()
  const searchParams = useSearchParams()
  const isReviewMode = searchParams.get('mode') === 'review'
  const supabase = createClient()

  const [book, setBook] = useState<Book | null>(null)
  const [level, setLevel] = useState('beginner')
  const [phase, setPhase] = useState<Phase>('range')

  const [from, setFrom] = useState(0)
  const [to, setTo] = useState(1)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [answered, setAnswered] = useState<({ picked: number; correct: boolean } | null)[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [followUps, setFollowUps] = useState(0)

  const [quoteText, setQuoteText] = useState('')
  const [quotePage, setQuotePage] = useState('')
  const [showQuoteEntry, setShowQuoteEntry] = useState(false)

  const [skipsUsed, setSkipsUsed] = useState(0)
  const [isPlus, setIsPlus] = useState(false)
  const [skipping, setSkipping] = useState(false)

  const [micListening, setMicListening] = useState(false)
  const [micRecognition, setMicRecognition] = useState<SpeechRecognitionLike | null>(null)
  const [quoteMicListening, setQuoteMicListening] = useState(false)
  const [quoteMicRecognition, setQuoteMicRecognition] = useState<SpeechRecognitionLike | null>(null)

  const [bookSummary, setBookSummary] = useState<BookSummaryResult | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [finishStats, setFinishStats] = useState<{ reflections: number; quotes: number } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: b } = await supabase.from('books').select('*').eq('id', bookId).single()
      if (!b) return
      setBook(b)
      const totalUnits = b.tracking_mode === 'page' ? b.total_pages : b.total_chapters
      const f = b.current_chapter
      setFrom(f)
      setTo(Math.min(totalUnits ?? f + 1, f + 1))

      const { data: userData } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('profiles').select('reading_level, is_beta_tester').eq('id', userData.user?.id).single()
      if (profile) {
        setLevel(profile.reading_level)
        setIsPlus(!!profile.is_beta_tester)
      }

      if (isReviewMode) {
        setPhase('loading')
        const priorQuestions = (b.asked_questions || []).slice(-10)
        const level2 = profile?.reading_level || 'beginner'
        const qs = await generateReviewQuestions(b, level2, priorQuestions)
        if (!qs) {
          setPhase('error')
          return
        }
        setQuestions(qs)
        setAnswers(new Array(qs.length).fill(''))
        setAnswered(new Array(qs.length).fill(null))
        setQIndex(0)
        setPhase('questions')
      }
    }
    load()
  }, [bookId, isReviewMode])

  if (!book) return <Loading />

  const isPageMode = book.tracking_mode === 'page'
  const unitLabel = isPageMode ? 'p.' : 'Ch '
  const unitWord = isPageMode ? 'page' : 'chapter'
  const totalUnits = isPageMode ? book.total_pages : book.total_chapters

  const confirmRange = async () => {
    setPhase('loading')
    const priorQuestions = (book.asked_questions || []).slice(-10)

    if (level === 'intermediate') {
      const q = await generateSingleQuestion(book, from, to, priorQuestions, 'mc')
      if (!q) {
        setPhase('error')
        return
      }
      setQuestions([q])
      setAnswers([''])
      setAnswered([null])
      setQIndex(0)
      setPhase('questions')
      return
    }

    const qs = await generateCheckinQuestions(book, level, from, to, priorQuestions)
    if (!qs) {
      setPhase('error')
      return
    }
    setQuestions(qs)
    setAnswers(new Array(qs.length).fill(''))
    setAnswered(new Array(qs.length).fill(null))
    setQIndex(0)
    setPhase('questions')
  }

  const pickMC = (optIndex: number, label: string) => {
    const q = questions[qIndex]
    const newAnswers = [...answers]
    newAnswers[qIndex] = label
    const newAnswered = [...answered]
    newAnswered[qIndex] = { picked: optIndex, correct: optIndex === q.correctIndex }
    setAnswers(newAnswers)
    setAnswered(newAnswered)
  }

  const setReflectAnswer = (val: string) => {
    const newAnswers = [...answers]
    newAnswers[qIndex] = val
    setAnswers(newAnswers)
  }

  const toggleVoiceForReflection = () => {
    if (micListening && micRecognition) {
      micRecognition.stop()
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
    setMicRecognition(recog)
    recog.onresult = async (e) => {
      const transcript = e.results[0][0].transcript
      const cleaned = await cleanupTranscript(transcript)
      const existing = answers[qIndex] || ''
      setReflectAnswer(existing ? existing.trim() + ' ' + cleaned : cleaned)
    }
    recog.onerror = () => { setMicListening(false); setMicRecognition(null) }
    recog.onend = () => { setMicListening(false); setMicRecognition(null) }
    recog.start()
  }

  const toggleVoiceForQuote = () => {
    if (quoteMicListening && quoteMicRecognition) {
      quoteMicRecognition.stop()
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
    setQuoteMicListening(true)
    setQuoteMicRecognition(recog)
    recog.onresult = async (e) => {
      const transcript = e.results[0][0].transcript
      const cleaned = await cleanupTranscript(transcript)
      setQuoteText((prev) => (prev ? prev.trim() + ' ' + cleaned : cleaned))
    }
    recog.onerror = () => { setQuoteMicListening(false); setQuoteMicRecognition(null) }
    recog.onend = () => { setQuoteMicListening(false); setQuoteMicRecognition(null) }
    recog.start()
  }

  const skipCanUse = isPlus || skipsUsed < 1

  const handleSkip = async () => {
    if (!skipCanUse || skipping) return
    setSkipping(true)
    const currentQ = questions[qIndex]
    const priorQuestions = [...(book.asked_questions || []), ...questions.map((q) => q.prompt)].slice(-10)
    const replacement = await generateReplacementQuestion(book, from, to, priorQuestions, currentQ.type)
    setSkipping(false)

    if (!replacement) return

    const newQuestions = [...questions]
    newQuestions[qIndex] = replacement
    setQuestions(newQuestions)

    const newAnswers = [...answers]
    newAnswers[qIndex] = ''
    setAnswers(newAnswers)

    const newAnswered = [...answered]
    newAnswered[qIndex] = null
    setAnswered(newAnswered)

    if (!isPlus) setSkipsUsed(skipsUsed + 1)
  }

  const nextStep = async () => {
    if (!answers[qIndex]) return
    const currentQ = questions[qIndex]
    const isLastPlanned = qIndex === questions.length - 1

    const wrongSoFar = answered.filter((a) => a && a.correct === false).length
    const shouldAskMoreCasual = level === 'beginner' && isLastPlanned && wrongSoFar > 0 && questions.length < 5

    if (shouldAskMoreCasual) {
      setPhase('loading')
      const priorQuestions = [...(book.asked_questions || []), ...questions.map((q) => q.prompt)].slice(-10)
      const extra = await generateCheckinQuestions(book, level, from, to, priorQuestions)
      if (extra && extra.length) {
        setQuestions([...questions, extra[0]])
        setAnswers([...answers, ''])
        setAnswered([...answered, null])
        setQIndex(qIndex + 1)
        setPhase('questions')
      } else {
        await finish()
      }
      return
    }

    if (level === 'intermediate' && currentQ.type === 'mc' && isLastPlanned) {
      const mcCount = questions.filter((q) => q.type === 'mc').length
      const wasCorrect = answered[qIndex]?.correct
      const priorQuestions = [...(book.asked_questions || []), ...questions.map((q) => q.prompt)].slice(-10)

      if (!wasCorrect && mcCount < 3) {
        setPhase('loading')
        const nextMc = await generateSingleQuestion(book, from, to, priorQuestions, 'mc')
        if (nextMc) {
          setQuestions([...questions, nextMc])
          setAnswers([...answers, ''])
          setAnswered([...answered, null])
          setQIndex(qIndex + 1)
          setPhase('questions')
          return
        }
      }

      setPhase('loading')
      const reflectQ = await generateSingleQuestion(book, from, to, priorQuestions, 'reflect')
      if (reflectQ) {
        setQuestions([...questions, reflectQ])
        setAnswers([...answers, ''])
        setAnswered([...answered, null])
        setQIndex(qIndex + 1)
        setPhase('questions')
        return
      }
      await finish()
      return
    }

    const shouldFollowUp = (level === 'intermediate' || level === 'advanced') && isLastPlanned && currentQ.type === 'reflect' && followUps < 1

    if (shouldFollowUp) {
      const shallow = await isReflectionShallow(answers[qIndex])
      if (shallow) {
        setPhase('loading')
        const followUpQ = await getFollowUpQuestion(book, currentQ.prompt, answers[qIndex])
        if (followUpQ) {
          setQuestions([...questions, followUpQ])
          setAnswers([...answers, ''])
          setAnswered([...answered, null])
          setQIndex(qIndex + 1)
          setFollowUps(followUps + 1)
          setPhase('questions')
          return
        }
        setPhase('questions')
      }
    }

    if (qIndex < questions.length - 1) {
      setQIndex(qIndex + 1)
    } else {
      setPhase('quotePrompt')
    }
  }

  const finish = async () => {
    const range = isReviewMode ? 'Review' : (to === from + 1 ? `${unitLabel}${to}` : `${unitLabel}${from + 1}-${to}`)
    await saveCheckinEntries(book.id, questions, answers, range)

    let justFinished = false

    if (!isReviewMode) {
      const status = to >= (totalUnits ?? 0) ? 'finished' : 'currently_reading'
      justFinished = status === 'finished' && book.status !== 'finished'
      const newAsked = [...(book.asked_questions || []), ...questions.map((q) => q.prompt)]
      await updateBookProgress(book.id, to, status, newAsked)
    } else {
      const newAsked = [...(book.asked_questions || []), ...questions.map((q) => q.prompt)]
      await updateBookProgress(book.id, book.current_chapter, book.status, newAsked)
    }

    await incrementCheckinCount()

    if (justFinished) {
      const { data: userData } = await supabase.auth.getUser()
      const { data: allEntries } = await supabase.from('entries').select('*').eq('book_id', book.id).eq('user_id', userData.user?.id)
      const reflections = (allEntries || []).filter((e) => e.kind === 'entry').length
      const quotes = (allEntries || []).filter((e) => e.kind === 'quote').length
      setFinishStats({ reflections, quotes })
      setPhase('justFinished')
      setSummaryLoading(true)
      const summary = await generateBookSummary(book, allEntries || [])
      setBookSummary(summary)
      setSummaryLoading(false)
      return
    }

    router.push(isReviewMode ? `/journal?book=${book.id}` : '/home')
    router.refresh()
  }

  const saveQuoteAndFinish = async () => {
    if (quoteText.trim()) {
      await saveQuote(book.id, quoteText, quotePage)
    }
    await finish()
  }

  const currentQ = questions[qIndex]
  const currentAnswered = answered[qIndex]

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6', fontFamily: 'Inter, sans-serif' }}>
      <style>{pulseKeyframes}</style>
      <div className="aw-container" style={{ width: '100%', margin: '0 auto', padding: '60px 22px 30px', boxSizing: 'border-box' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: isReviewMode ? 8 : 22 }}>
          <div onClick={() => router.push('/home')} style={{ fontSize: 20, color: '#3A3A38', cursor: 'pointer' }}>←</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500, color: '#3A3A38' }}>{book.title}</div>
        </div>
        {isReviewMode && (
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B8F76', marginBottom: 22 }}>Revisiting this book</div>
        )}

        {phase === 'range' && (
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 500, color: '#3A3A38', marginBottom: 8 }}>Mark your progress</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: '#5c5642', marginBottom: 26 }}>
              You were on {unitLabel}{from} of {totalUnits}. Where did you read to?
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 500, color: '#3A3A38' }}>{unitLabel}</div>
              <input
                type="number"
                inputMode="numeric"
                value={to}
                min={from}
                max={totalUnits ?? from + 1}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (isNaN(val)) { setTo(from); return }
                  const clamped = Math.max(from, Math.min(totalUnits ?? val, val))
                  setTo(clamped)
                }}
                style={{
                  width: 110, textAlign: 'center', fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 500, color: '#3A3A38',
                  background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 12, padding: '10px 8px',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: 14, color: '#8A8880' }}>/ {totalUnits}</div>
            </div>

            <input
              type="range" min={from} max={totalUnits ?? from + 1} value={to}
              onChange={(e) => setTo(parseInt(e.target.value, 10))}
              style={{ width: '100%', marginBottom: 30 }}
            />

            <button onClick={confirmRange} style={btnStyle('#3A3A38')}>
              I&apos;ve read to {unitWord} {to}
            </button>
          </div>
        )}

        {phase === 'loading' && (
          <div style={{ textAlign: 'center', padding: '60px 10px' }}>
            <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 16, color: '#6B8F76', marginBottom: 8 }}>thinking about your chapter…</div>
            <div style={{ fontSize: 13, color: '#8A8880' }}>Preparing your check-in</div>
          </div>
        )}

        {phase === 'error' && (
          <div style={{ textAlign: 'center', padding: '60px 10px' }}>
            <div style={{ fontSize: 14, color: '#5c5642', marginBottom: 16 }}>Something went wrong putting together your check-in.</div>
            <button onClick={confirmRange} style={btnStyle('#3A3A38')}>Try again</button>
          </div>
        )}

        {phase === 'questions' && currentQ && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6B8F76', marginBottom: 10 }}>Question {qIndex + 1}</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 500, color: '#3A3A38', marginBottom: 22, lineHeight: 1.45 }}>
              {currentQ.prompt}
            </div>

            {currentQ.type === 'mc' && currentQ.options && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {currentQ.options.map((opt, i) => {
                  const isPicked = currentAnswered?.picked === i
                  const isCorrectOpt = currentAnswered && i === currentQ.correctIndex
                  let bg = '#F3F1EC'
                  let border = 'rgba(58,58,56,0.08)'
                  if (currentAnswered) {
                    if (isCorrectOpt) { bg = '#EAF0E6'; border = '#6B8F76' }
                    else if (isPicked) { bg = '#F5E9E4'; border = '#8a4a3a' }
                  } else if (opt === answers[qIndex]) {
                    border = '#3A3A38'
                  }
                  return (
                    <div
                      key={i}
                      onClick={() => !currentAnswered && pickMC(i, opt)}
                      style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 12, padding: '15px 18px', fontSize: 14.5, lineHeight: 1.5, color: '#3f3b2e', cursor: currentAnswered ? 'default' : 'pointer' }}
                    >
                      {opt}
                    </div>
                  )
                })}
              </div>
            )}

            {currentAnswered && (
              <div style={{ fontSize: 13, fontWeight: 600, color: '#5c5642', marginBottom: 16 }}>
                {currentAnswered.correct ? 'Correct!' : 'Not quite.'}
              </div>
            )}

            {currentQ.type === 'reflect' && (
              <div style={{ position: 'relative', marginBottom: 26 }}>
                <textarea
                  value={answers[qIndex]}
                  onChange={(e) => setReflectAnswer(e.target.value)}
                  placeholder="Take your time…"
                  style={{ width: '100%', minHeight: 140, background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 12, padding: '14px 48px 14px 14px', fontSize: 15, lineHeight: 1.6, color: '#3f3b2e', resize: 'vertical', boxSizing: 'border-box' }}
                />
                <div
                  onClick={toggleVoiceForReflection}
                  style={{
                    position: 'absolute', right: 12, top: 12, width: 32, height: 32, borderRadius: '50%',
                    background: micListening ? '#6B8F76' : '#3A3A38', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
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
                  <div style={{ position: 'absolute', right: 12, top: 50, fontSize: 11, fontWeight: 600, color: '#6B8F76' }}>
                    Listening… tap to stop
                  </div>
                )}
              </div>
            )}

            <button onClick={nextStep} disabled={!answers[qIndex]} style={btnStyle(answers[qIndex] ? '#3A3A38' : 'rgba(58,58,56,0.3)')}>
              Next
            </button>

            <div style={{ textAlign: 'center', marginTop: 14 }}>
              {skipCanUse ? (
                <div onClick={handleSkip} style={{ fontSize: 12.5, fontWeight: 500, color: '#8A8880', cursor: skipping ? 'default' : 'pointer' }}>
                  {skipping ? 'Finding a new question…' : 'Skip this question'}
                </div>
              ) : (
                <div onClick={() => router.push('/paywall')} style={{ fontSize: 12.5, color: '#8A8880' }}>
                  Out of free skips — <span style={{ fontWeight: 600, color: '#6B8F76', cursor: 'pointer' }}>get unlimited with Plus</span>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === 'quotePrompt' && !showQuoteEntry && (
          <div style={{ textAlign: 'center', padding: '30px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 16, color: '#6B8F76' }}>before you go</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 500, color: '#3A3A38' }}>Was there a line you loved?</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#5c5642', maxWidth: 260 }}>Save a phrase or sentence from what you just read.</div>
            <button onClick={() => setShowQuoteEntry(true)} style={{ ...btnStyle('#3A3A38'), maxWidth: 240 }}>Save a line</button>
            <div onClick={finish} style={{ fontSize: 13, fontWeight: 500, color: '#8A8880', cursor: 'pointer', marginTop: 2 }}>Skip</div>
          </div>
        )}

        {phase === 'quotePrompt' && showQuoteEntry && (
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 500, color: '#3A3A38', marginBottom: 16 }}>Save a line</div>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <textarea
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="Type or speak the line…"
                style={{ width: '100%', minHeight: 120, background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 12, padding: '14px 48px 14px 14px', fontSize: 15, lineHeight: 1.6, color: '#3f3b2e', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <div
                onClick={toggleVoiceForQuote}
                style={{
                  position: 'absolute', right: 12, top: 12, width: 32, height: 32, borderRadius: '50%',
                  background: quoteMicListening ? '#6B8F76' : '#3A3A38', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  animation: quoteMicListening ? 'mic-pulse 1.4s infinite' : 'none',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="4.5" y="0.5" width="5" height="8" rx="2.5" fill="#f3ecdc" />
                  <path d="M2 6.5C2 9.26 4.24 11.5 7 11.5C9.76 11.5 12 9.26 12 6.5" stroke="#f3ecdc" strokeWidth="1.3" strokeLinecap="round" />
                  <line x1="7" y1="11.5" x2="7" y2="13.5" stroke="#f3ecdc" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              {quoteMicListening && (
                <div style={{ position: 'absolute', right: 12, top: 50, fontSize: 11, fontWeight: 600, color: '#6B8F76' }}>
                  Listening… tap to stop
                </div>
              )}
            </div>
            <input
              value={quotePage}
              onChange={(e) => setQuotePage(e.target.value)}
              placeholder="Page (optional)"
              style={{ width: '100%', background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#3A3A38', marginBottom: 20, boxSizing: 'border-box' }}
            />
            <button onClick={saveQuoteAndFinish} style={btnStyle('#3A3A38')}>Save entry</button>
          </div>
        )}

        {phase === 'justFinished' && (
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <div style={{ height: 1, background: 'rgba(58,58,56,0.12)', margin: '0 auto 24px', width: 60 }} />
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B8F76', marginBottom: 10 }}>Finished</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 600, color: '#3A3A38', marginBottom: 20 }}>{book.title}</div>

            {finishStats && (
              <div style={{ fontSize: 13.5, color: '#5c5642', marginBottom: 24 }}>
                You answered {finishStats.reflections} prompt{finishStats.reflections === 1 ? '' : 's'} · Saved {finishStats.quotes} quote{finishStats.quotes === 1 ? '' : 's'}
              </div>
            )}

            <div style={{ textAlign: 'left', background: '#F3F1EC', border: '1px solid rgba(58,58,56,0.08)', borderRadius: 14, padding: 18, marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B8F76', marginBottom: 8 }}>AI Summary</div>
              {summaryLoading ? (
                <div style={{ fontFamily: 'Spectral, serif', fontStyle: 'italic', fontSize: 13.5, color: '#8A8880' }}>Reflecting on your journey through this book…</div>
              ) : bookSummary ? (
                <div style={{ fontSize: 14, lineHeight: 1.65, color: '#4a4636' }}>{bookSummary.summary}</div>
              ) : (
                <div style={{ fontSize: 13.5, color: '#8A8880' }}>Not enough reflections yet to summarize.</div>
              )}
            </div>

            <div
              onClick={() => router.push(`/journal?book=${book.id}`)}
              style={{ fontSize: 13.5, fontWeight: 600, color: '#3A3A38', cursor: 'pointer', marginBottom: 16 }}
            >
              View Book Summary →
            </div>

            <button onClick={() => { router.push('/home'); router.refresh() }} style={btnStyle('#3A3A38')}>
              Done
            </button>
            <div style={{ height: 1, background: 'rgba(58,58,56,0.12)', margin: '24px auto 0', width: 60 }} />
          </div>
        )}

      </div>
    </div>
  )
}

function Loading() {
  return <div style={{ minHeight: '100vh', background: '#FAF9F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>
}

function btnStyle(bg: string): React.CSSProperties {
  return { width: '100%', textAlign: 'center', background: bg, color: '#f3ecdc', fontWeight: 600, fontSize: 15, padding: 15, borderRadius: 100, border: 'none', cursor: 'pointer' }
}