// lib/anon.ts
export function getAnonId() {
  if (typeof window === 'undefined') return 'anon_server'

  const KEY = 'chasjabara_anon_id'
  const existing = localStorage.getItem(KEY)
  if (existing && existing.length > 5) return existing

  // crypto가 있으면 더 안전하게 랜덤
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? `anon_${crypto.randomUUID()}`
      : `anon_${Math.random().toString(16).slice(2)}_${Date.now()}`

  localStorage.setItem(KEY, id)
  return id
}
