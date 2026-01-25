import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

export function getSupabaseBrowser(): SupabaseClient | null {
  // ✅ 서버(SSR)에서는 절대 만들지 않음
  if (typeof window === 'undefined') return null

  if (browserClient) return browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // ✅ 여기서 throw 하지 말고 null 반환 (500 방지)
  if (!url || !anon) {
    console.error('Supabase env missing in browser:', {
      hasUrl: !!url,
      hasAnon: !!anon,
    })
    return null
  }

  browserClient = createClient(url, anon)
  return browserClient
}

export function requireSupabaseBrowser(): SupabaseClient {
  const s = getSupabaseBrowser()
  if (!s) {
    throw new Error(
      'Supabase env missing. NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is empty.'
    )
  }
  return s
}
