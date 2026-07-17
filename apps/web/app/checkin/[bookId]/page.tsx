'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  type Book, type Question,
  generateCheckinQuestions, getFollowUpQuestion, isReflectionShallow,
  saveCheckinEntries, updateBookProgress, incrementCheckinCount, saveQuote,
} from '@/utils/supabase/queries'

type Phase = 'range' | 'loading' | 'questions' | 'quotePrompt' | 'error'

type SpeechRecognitionResultLike = { transcript: string }
interface SpeechRecognitionLike extends EventTarget {
  lang: string
  interimResults: boolean
  start: () => void
  onresult: ((e: { results: { 0: { 0: SpeechRecognitionResultLike } } }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

const pulseKeyframes = `
@keyframes mic-pulse {
  0% { box-shadow: 0 0 0 0 rgba(184,147,90,0.5); }
  70% { box-shadow: 0 0 0 10px rgba(184,147,90,0); }
  100% { box-shadow: 0 0 0 0 rgba(184,147,90,0); }
}
`

export default function CheckinPage() {
  const router = useRouter()
  const { bookId } = useParams<{ bookId: string }>()
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
  const [showQuoteEntry, setShowQuoteEntry] = useState(false)

  const [micListening, setMicListening] = useState(false)
  const [quoteMicListening, setQuoteMicListening] = useState(false)

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
      const { data: profile } = await supabase.from('profiles').select('reading_level').eq('id', userData.user?.id).single()
      if (profile) setLevel(profile.reading_level)
    }
    load()
  }, [bookId])

  if (!book) return <Loading />

  const isPageMode = book.tracking_mode === 'page'
  const unitLabel = isPageMode ? 'p.' : 'Ch '
  const unitWord = isPageMode ? 'page' : 'chapter'
  const totalUnits = isPageMode ? book.total_pages : book.total_chapters

  const confirmRange = async () => {
    setPhase('loading')
    const priorQuestions = (book.asked_questions || []).slice(-10)
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

  const startVoiceForReflection = () => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
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
      const existing = answers[qIndex] || ''
      setReflectAnswer(existing ? existing.trim() + ' ' + transcript : transcript)
    }
    recog.onerror = () => setMicListening(false)
    recog.onend = () => setMicListening(false)
    recog.start()
  }

  const startVoiceForQuote = () => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) {
      alert('Voice input needs microphone access — try this on a deployed HTTPS site.')
      return
    }
    const recog = new SR()
    recog.lang = 'en-US'
    recog.interimResults = false
    setQuoteMicListening(true)
    recog.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setQuoteText((prev) => (prev ? prev.trim() + ' ' + transcript : transcript))
    }
    recog.onerror = () => setQuoteMicListening(false)
    recog.onend = () => setQuoteMicListening(false)
    recog.start()
  }

  const nextStep = async () => {
    if (!answers[qIndex]) return
    const currentQ = questions[qIndex]
    const wrongSoFar = answered.filter((a) => a && a.correct === false).length
    const isLastPlanned = qIndex === questions.length - 1

    const shouldAskMoreCasual = level === 'beginner' && isLastPlanned && wrongSoFar > 0 && questions.length < 5
    const shouldFollowUp = (level === 'intermediate' || level === 'advanced') && isLastPlanned && currentQ.type === 'reflect' && followUps < 1

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
    const range = to === from + 1 ? `${unitLabel}${to}` : `${unitLabel}${from + 1}-${to}`
    await saveCheckinEntries(book.id, questions, answers, range)
    const status = to >= (totalUnits ?? 0) ? 'finished' : 'currently_reading'
    const newAsked = [...(book.asked_questions || []), ...questions.map((q) => q.prompt)]
    await updateBookProgress(book.id, to, status, newAsked)
    await incrementCheckinCount()
    router.push('/home')
    router.refresh()
  }

  const saveQuoteAndFinish = async () => {
    if (quoteText.trim()) {
      await saveQuote(book.id, quoteText)
    }
    await finish()
  }

  const currentQ = questions[qIndex]
  const currentAnswered = answered[qIndex]

  return (
    <div style={{ minHeight: '100vh', background: '#efe6d3', fontFamily: 'Inter, sans-serif' }}>
      <style>{pulseKeyframes}</style>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '60px 22px 30px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div onClick={() => router.push('/home')} style={{ fontSize: 20, color: '#33324a', cursor: 'pointer' }}>←</div>
          <div style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 700, color: '#33324a' }}>{book.title}</div>
        </div>

        {phase === 'range' && (
          <div>
            <div style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 600, color: '#33324a', marginBottom: 8 }}>Mark your progress</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: '#5c5642', marginBottom: 26 }}>
              You were on {unitLabel}{from} of {totalUnits}. Where did you read to?
            </div>
            <div style={{ textAlign: 'center', fontFamily: 'Lora, serif', fontSize: 40, fontWeight: 700, color: '#33324a', marginBottom: 14 }}>
              {unitLabel}{to}
            </div>
            <input
              type="range" min={from} max={totalUnits ?? from + 1} value={to}
              onChange={(e) => setTo(parseInt(e.target.value, 10))}
              style={{ width: '100%', marginBottom: 30 }}
            />
            <button onClick={confirmRange} style={btnStyle('#33324a')}>
              I&apos;ve read to {unitWord} {to}
            </button>
          </div>
        )}

        {phase === 'loading' && (
          <div style={{ textAlign: 'center', padding: '60px 10px' }}>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 15, color: '#b8935a', marginBottom: 8 }}>thinking about your chapter…</div>
            <div style={{ fontSize: 13, color: '#8d8570' }}>Preparing your check-in</div>
          </div>
        )}

        {phase === 'error' && (
          <div style={{ textAlign: 'center', padding: '60px 10px' }}>
            <div style={{ fontSize: 14, color: '#5c5642', marginBottom: 16 }}>Something went wrong putting together your check-in.</div>
            <button onClick={confirmRange} style={btnStyle('#33324a')}>Try again</button>
          </div>
        )}

        {phase === 'questions' && currentQ && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#b8935a', marginBottom: 10 }}>Question {qIndex + 1}</div>
            <div style={{ fontFamily: 'Lora, serif', fontSize: 20, fontWeight: 600, color: '#33324a', marginBottom: 22, lineHeight: 1.45 }}>
              {currentQ.prompt}
            </div>

            {currentQ.type === 'mc' && currentQ.options && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {currentQ.options.map((opt, i) => {
                  const isPicked = currentAnswered?.picked === i
                  const isCorrectOpt = currentAnswered && i === currentQ.correctIndex
                  let bg = '#fbf6ec'
                  let border = 'rgba(51,50,74,0.12)'
                  if (currentAnswered) {
                    if (isCorrectOpt) { bg = '#eaf0e6'; border = '#4b5d45' }
                    else if (isPicked) { bg = '#f5e9e4'; border = '#8a4a3a' }
                  } else if (opt === answers[qIndex]) {
                    border = '#33324a'
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
                  style={{ width: '100%', minHeight: 140, background: '#fbf6ec', border: '1px solid rgba(51,50,74,0.14)', borderRadius: 12, padding: '14px 48px 14px 14px', fontSize: 15, lineHeight: 1.6, color: '#3f3b2e', resize: 'vertical', boxSizing: 'border-box' }}
                />
                <div
                  onClick={startVoiceForReflection}
                  style={{
                    position: 'absolute', right: 12, top: 12, width: 32, height: 32, borderRadius: '50%',
                    background: micListening ? '#b8935a' : '#33324a', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                  <div style={{ position: 'absolute', right: 12, top: 50, fontSize: 11, fontWeight: 600, color: '#b8935a' }}>
                    Listening…
                  </div>
                )}
              </div>
            )}

            <button onClick={nextStep} disabled={!answers[qIndex]} style={btnStyle(answers[qIndex] ? '#33324a' : 'rgba(51,50,74,0.3)')}>
              Next
            </button>
          </div>
        )}

        {phase === 'quotePrompt' && !showQuoteEntry && (
          <div style={{ textAlign: 'center', padding: '30px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: '#b8935a' }}>before you go</div>
            <div style={{ fontFamily: 'Lora, serif', fontSize: 22, fontWeight: 700, color: '#33324a' }}>Was there a line you loved?</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#5c5642', maxWidth: 260 }}>Save a phrase or sentence from what you just read.</div>
            <button onClick={() => setShowQuoteEntry(true)} style={{ ...btnStyle('#33324a'), maxWidth: 240 }}>Save a line</button>
            <div onClick={finish} style={{ fontSize: 13, fontWeight: 500, color: '#8d8570', cursor: 'pointer', marginTop: 2 }}>Skip</div>
          </div>
        )}

        {phase === 'quotePrompt' && showQuoteEntry && (
          <div>
            <div style={{ fontFamily: 'Lora, serif', fontSize: 18, fontWeight: 600, color: '#33324a', marginBottom: 16 }}>Save a line</div>
            <div style={{ position: 'relative', marginBottom: 26 }}>
              <textarea
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="Type or speak the line…"
                style={{ width: '100%', minHeight: 120, background: '#fbf6ec', border: '1px solid rgba(51,50,74,0.14)', borderRadius: 12, padding: '14px 48px 14px 14px', fontSize: 15, lineHeight: 1.6, color: '#3f3b2e', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <div
                onClick={startVoiceForQuote}
                style={{
                  position: 'absolute', right: 12, top: 12, width: 32, height: 32, borderRadius: '50%',
                  background: quoteMicListening ? '#b8935a' : '#33324a', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                <div style={{ position: 'absolute', right: 12, top: 50, fontSize: 11, fontWeight: 600, color: '#b8935a' }}>
                  Listening…
                </div>
              )}
            </div>
            <button onClick={saveQuoteAndFinish} style={btnStyle('#33324a')}>Save entry</button>
          </div>
        )}

      </div>
    </div>
  )
}

function Loading() {
  return <div style={{ minHeight: '100vh', background: '#efe6d3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>
}

function btnStyle(bg: string): React.CSSProperties {
  return { width: '100%', textAlign: 'center', background: bg, color: '#f3ecdc', fontWeight: 600, fontSize: 15, padding: 15, borderRadius: 100, border: 'none', cursor: 'pointer' }
}