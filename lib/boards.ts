function safeDecode(v: string) {
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}

export type BoardInfo = {
  name: string
  slug: string
}

export function resolveBoard(raw: string): BoardInfo {
  const decoded = safeDecode(raw ?? '')
  const name = decoded.trim() || '게시판'
  const slug = encodeURIComponent(name)
  return { name, slug }
}
