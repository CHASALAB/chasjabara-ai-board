import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _browserClient: SupabaseClient | null = null

export function getSupabaseBrowser(): SupabaseClient {
  if (_browserClient) return _browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anon) {
    // ✅ 여기서 “throw”를 해버리면 리턴 타입에 null이 섞일 이유가 없어짐
    throw new Error(
      'Supabase env missing. NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is empty.'
    )
  }

  _browserClient = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return _browserClient
}
