import { createClient } from '@/utils/supabase/client'

export type Book = {
  id: string
  user_id: string
  title: string
  author: string | null
  genre: string | null
  tracking_mode: 'chapter' | 'page'
  total_chapters: number | null
  total_pages: number | null
  current_chapter: number
  status: 'want_to_read' | 'currently_reading' | 'finished'
  cover_color: string | null
  cover_url: string | null
  asked_questions: string[]
  created_at: string
}

export async function getBooks(): Promise<Book[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getBooks failed:', error)
    return []
  }
  return data as Book[]
}

export async function addBook(book: {
  title: string
  author: string
  genre: string
  tracking_mode: 'chapter' | 'page'
  total_chapters: number | null
  total_pages: number | null
  status: 'want_to_read' | 'currently_reading' | 'finished'
  cover_color: string
  cover_url: string
}) {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { error: 'Not logged in' }

  const { data, error } = await supabase
    .from('books')
    .insert({
      user_id: userData.user.id,
      title: book.title,
      author: book.author,
      genre: book.genre,
      tracking_mode: book.tracking_mode,
      total_chapters: book.total_chapters,
      total_pages: book.total_pages,
      current_chapter: book.status === 'finished' ? (book.total_chapters ?? book.total_pages ?? 0) : 0,
      status: book.status,
      cover_color: book.cover_color,
      cover_url: book.cover_url,
    })
    .select()
    .single()

  if (error) {
    console.error('addBook failed:', error)
    return { error: error.message }
  }
  return { data }
}

export type Question = {
  id: string
  type: 'mc' | 'reflect'
  prompt: string
  options?: string[]
  correctIndex?: number
}

export async function generateCheckinQuestions(
  book: Book,
  level: string,
  fromUnit: number,
  toUnit: number,
  priorQuestions: string[]
): Promise<Question[] | null> {
  const { callAI, extractJSON, stripMarkdown } = await import('@/utils/ai')

  const isPageMode = book.tracking_mode === 'page'
  const unit = isPageMode ? 'page' : 'chapter'
  const rangeLabel = toUnit > fromUnit + 1 ? `${unit}s ${fromUnit + 1}-${toUnit}` : `${unit} ${toUnit}`
  const priorList = priorQuestions.length
    ? `\nQuestions already asked earlier in this book (do NOT repeat these or ask near-duplicates):\n- ${priorQuestions.join('\n- ')}`
    : ''

  const prompt = `You are a reading companion helping someone reflect on what they just read.

Book: "${book.title}" by ${book.author}
The reader just finished ${rangeLabel} (out of ${isPageMode ? book.total_pages : book.total_chapters} total).
Reader level: ${level}${priorList}


Generate check-in questions specifically about what happens in ${rangeLabel} — not earlier chapters, not the book in general.
- If level is "beginner": generate exactly 2 simple multiple-choice questions testing recall of THIS section specifically.
- If level is "intermediate": generate exactly 3 questions — the first 2 should be multiple-choice recall questions, the third should be an open reflection question, all about THIS section.
- If level is "advanced": generate exactly 2 open reflection questions about THIS section — feelings, predictions, connections.

Respond with ONLY valid JSON, no markdown fences, no preamble, in this exact shape:
[{"id":"q1","type":"mc"|"reflect","prompt":"question text","options":["A","B","C","D"],"correctIndex":0}]
(omit "options"/"correctIndex" when type is "reflect")

If you are not confident about specific plot details for this section, ask a general reflection question instead of a specific recall question.`

  const raw = await callAI(prompt)
  if (!raw) return null
  const questions = extractJSON<Question[]>(raw)
  if (!questions || !Array.isArray(questions) || questions.length === 0) return null

  questions.forEach((q) => {
    q.prompt = stripMarkdown(q.prompt)
    if (q.options) q.options = q.options.map(stripMarkdown)
  })
  return questions
}

export async function getFollowUpQuestion(
  book: Book,
  priorPrompt: string,
  priorAnswer: string
): Promise<Question | null> {
  const { callAI, extractJSON, stripMarkdown } = await import('@/utils/ai')

  const prompt = `A reader was asked: "${priorPrompt}" about "${book.title}" and answered: "${priorAnswer}"
Their answer felt brief. Write ONE warm, specific follow-up question that invites them to go a little deeper — not a generic "tell me more."
Write in plain text only — no markdown, no asterisks, no bold/italic formatting.
Respond with ONLY valid JSON: {"id":"qf","type":"reflect","prompt":"question text"}`

  const raw = await callAI(prompt)
  if (!raw) return null
  const q = extractJSON<Question>(raw)
  if (q) q.prompt = stripMarkdown(q.prompt)
  return q
}

export async function isReflectionShallow(answerText: string): Promise<boolean> {
  if (!answerText || answerText.trim().length > 140) return false
  const { callAI } = await import('@/utils/ai')
  const prompt = `Someone answered a reading reflection question with: "${answerText}"
Is this a shallow, one-word, or low-effort answer that could benefit from a gentle follow-up question?
Respond with ONLY "yes" or "no".`
  const raw = await callAI(prompt)
  return !!raw && raw.trim().toLowerCase().startsWith('yes')
}

export async function saveCheckinEntries(
  bookId: string,
  questions: Question[],
  answers: string[],
  chapterRange: string
) {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { error: 'Not logged in' }

  const rows = questions.map((q, i) => ({
    user_id: userData.user!.id,
    book_id: bookId,
    kind: 'entry',
    question: q.prompt,
    response: answers[i],
    chapter_range: chapterRange,
    question_type: q.type,
  }))

  const { error } = await supabase.from('entries').insert(rows)
  if (error) {
    console.error('saveCheckinEntries failed:', error)
    return { error: error.message }
  }
  return { success: true }
}

export async function updateBookProgress(bookId: string, newCurrent: number, status: string, newAskedQuestions: string[]) {
  const supabase = createClient()
  const { error } = await supabase
    .from('books')
    .update({ current_chapter: newCurrent, status, asked_questions: newAskedQuestions })
    .eq('id', bookId)

  if (error) console.error('updateBookProgress failed:', error)
}

export async function incrementCheckinCount(): Promise<number> {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return 0

  const { data } = await supabase
    .from('checkin_counts')
    .select('total_checkins')
    .eq('user_id', userData.user.id)
    .single()

  const newCount = (data?.total_checkins ?? 0) + 1
  await supabase.from('checkin_counts').upsert({ user_id: userData.user.id, total_checkins: newCount })
  return newCount
}

export async function saveQuote(bookId: string, text: string) {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { error: 'Not logged in' }

  const { error } = await supabase.from('entries').insert({
    user_id: userData.user.id,
    book_id: bookId,
    kind: 'quote',
    text: text.trim(),
  })

  if (error) {
    console.error('saveQuote failed:', error)
    return { error: error.message }
  }
  return { success: true }
}

export type Entry = {
  id: string
  book_id: string
  kind: 'entry' | 'quote'
  question: string | null
  response: string | null
  text: string | null
  chapter_range: string | null
  question_type: string | null
  created_at: string
}

export async function getEntriesForUser(): Promise<Entry[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getEntriesForUser failed:', error)
    return []
  }
  return data as Entry[]
}

export async function findCrossBookConnection(
  currentBook: Book,
  currentEntries: Entry[],
  otherBooksWithEntries: { title: string; entries: Entry[] }[]
): Promise<{ bookTitle: string; theme: string; note: string } | null> {
  const { callAI, extractJSON } = await import('@/utils/ai')

  if (!currentEntries.length || !otherBooksWithEntries.length) return null

  const summarize = (e: Entry) => (e.kind === 'quote' ? `Saved line: "${e.text}"` : `${e.question} — ${e.response}`)

  const currentSummary = currentEntries.slice(0, 6).map(summarize).join('\n')
  const othersSummary = otherBooksWithEntries
    .map((ob) => `Book: "${ob.title}"\n${ob.entries.slice(0, 4).map(summarize).join('\n')}`)
    .join('\n\n')

  const prompt = `Someone is reading "${currentBook.title}" and has written these journal reflections:
${currentSummary}

Here are their reflections from OTHER books they have read:

${othersSummary}

Is there a genuine thematic connection between what they wrote about "${currentBook.title}" and any ONE other book — a shared emotion, idea, or experience (not just a shared word)?
If yes, respond with ONLY valid JSON: {"found":true,"bookTitle":"...","theme":"a short phrase","note":"one warm sentence connecting the two, written to the reader directly"}
If no genuine connection, respond with ONLY: {"found":false}
Write in plain text only — no markdown formatting.`

  const raw = await callAI(prompt)
  if (!raw) return null
  const result = extractJSON<{ found: boolean; bookTitle?: string; theme?: string; note?: string }>(raw)
  if (!result || !result.found) return null
  return { bookTitle: result.bookTitle!, theme: result.theme!, note: result.note! }
}

export type Profile = {
  id: string
  reading_level: string
  onboarded: boolean
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userData.user.id)
    .single()

  if (error) {
    console.error('getProfile failed:', error)
    return null
  }
  return data as Profile
}

export async function updateReadingLevel(level: string) {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { error: 'Not logged in' }

  const { error } = await supabase
    .from('profiles')
    .update({ reading_level: level })
    .eq('id', userData.user.id)

  if (error) {
    console.error('updateReadingLevel failed:', error)
    return { error: error.message }
  }
  return { success: true }
}

export async function getCheckinCount(): Promise<number> {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return 0

  const { data } = await supabase
    .from('checkin_counts')
    .select('total_checkins')
    .eq('user_id', userData.user.id)
    .single()

  return data?.total_checkins ?? 0
}

export type TitleSuggestion = {
  title: string
  author: string
  genre: string
  trackingMode: 'chapter' | 'page'
  totalChapters: number | null
  totalPages: number | null
  coverUrl: string
}

export async function fetchTitleSuggestions(query: string): Promise<TitleSuggestion[]> {
  if (!query || query.trim().length < 3) return []

  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(query)}&maxResults=5&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY}`
    )
    if (res.status === 429) {
      console.warn('Google Books API rate limited — try again in a moment')
      return []
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    if (!data.items || !Array.isArray(data.items)) return []

    return data.items
      .filter((item: { volumeInfo?: { title?: string } }) => item.volumeInfo?.title)
      .map((item: {
        volumeInfo: {
          title: string
          authors?: string[]
          categories?: string[]
          pageCount?: number
          imageLinks?: { thumbnail?: string; smallThumbnail?: string }
        }
      }) => {
        const vi = item.volumeInfo
        const rawCover = vi.imageLinks?.thumbnail || vi.imageLinks?.smallThumbnail || ''
        const coverUrl = rawCover.replace('http://', 'https://')
        const genre = vi.categories?.[0]?.split(' / ')[0] ?? ''

        return {
          title: vi.title,
          author: vi.authors?.join(', ') ?? '',
          genre,
          trackingMode: 'page' as const,
          totalChapters: null,
          totalPages: vi.pageCount ?? null,
          coverUrl,
        }
      })
      .filter((s: TitleSuggestion) => s.totalPages !== null)
  } catch (err) {
    console.error('fetchTitleSuggestions (Google Books) failed:', err)
    return []
  }
}


export async function submitBugReport(page: string, message: string) {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return { error: 'Not logged in' }

  const { error } = await supabase.from('bug_reports').insert({
    user_id: userData.user.id,
    page,
    message: message.trim(),
  })

  if (error) {
    console.error('submitBugReport failed:', error)
    return { error: error.message }
  }
  return { success: true }
}