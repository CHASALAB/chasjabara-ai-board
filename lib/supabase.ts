import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

function getEnv(name: string) {
  const v = process.env[name]
  return (v ?? '').trim()
}

// ✅ 브라우저(클라이언트 컴포넌트) 전용
export function getSupabaseBrowser(): SupabaseClient {
  if (_client) return _client

  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anon = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  if (!url || !anon) {
    // 빌드/런타임에서 바로 원인 보이게
    throw new Error(
      'Supabase env missing. NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is empty.'
    )
  }

  _client = createClient(url, anon, {
    auth: { persistSession: false },
  })
  return _client
}

// ✅ 예전에 쓰던 이름(오류 방지용 별칭)
export function requireSupabaseBrowser(): SupabaseClient {
  return getSupabaseBrowser()
}
