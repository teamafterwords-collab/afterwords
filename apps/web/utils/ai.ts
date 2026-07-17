import { createClient } from '@/utils/supabase/client'

export async function callAI(prompt: string): Promise<string | null> {
  const supabase = createClient()
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-complete`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ prompt }),
      }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data.text as string
  } catch (err) {
    console.error('callAI failed:', err)
    return null
  }
}

export function extractJSON<T>(raw: string): T | null {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  const arrMatch = cleaned.match(/\[[\s\S]*\]/)
  const objMatch = cleaned.match(/\{[\s\S]*\}/)
  const match = arrMatch || objMatch
  if (!match) return null
  try {
    return JSON.parse(match[0]) as T
  } catch {
    return null
  }
}

export function stripMarkdown(text: string): string {
  if (!text) return text
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
}