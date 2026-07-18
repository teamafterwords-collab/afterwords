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

  // If the response starts with { it's an object at the top level — match the outermost braces.
  // If it starts with [ it's an array — match the outermost brackets.
  // Checking the first non-whitespace character avoids greedily matching a nested array/object first.
  const firstChar = cleaned[0]

  if (firstChar === '{') {
    const objMatch = cleaned.match(/\{[\s\S]*\}/)
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]) as T
      } catch {
        return null
      }
    }
  }

  if (firstChar === '[') {
    const arrMatch = cleaned.match(/\[[\s\S]*\]/)
    if (arrMatch) {
      try {
        return JSON.parse(arrMatch[0]) as T
      } catch {
        return null
      }
    }
  }

  // Fallback: try both patterns in case the response has leading junk before the JSON
  const arrMatch = cleaned.match(/\[[\s\S]*\]/)
  const objMatch = cleaned.match(/\{[\s\S]*\}/)
  const match = objMatch && (!arrMatch || objMatch.index! <= arrMatch.index!) ? objMatch : arrMatch
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