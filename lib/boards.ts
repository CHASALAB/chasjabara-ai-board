export type BoardInfo = {
  slug: string
  title: string
  db: string
}

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}

export function resolveBoard(rawParam: string): BoardInfo {
  const raw = /%[0-9A-Fa-f]{2}/.test(rawParam) ? safeDecode(rawParam) : rawParam

  if (raw === 'who' || raw === '이 사람 어때?' || raw === '이사람어때') {
    return { slug: 'who', title: '이 사람 어때?', db: '이 사람 어때?' }
  }

  return { slug: raw, title: raw, db: raw }
}
