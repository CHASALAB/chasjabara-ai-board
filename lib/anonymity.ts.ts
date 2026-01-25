export const MIN_EVIDENCE_SAMPLE = 6

export function shouldHideEvidence(count: number, min: number = MIN_EVIDENCE_SAMPLE) {
  return Number(count ?? 0) < Number(min ?? MIN_EVIDENCE_SAMPLE)
}

export function bucketCount(count: number, min: number = MIN_EVIDENCE_SAMPLE) {
  const c = Math.max(0, Number(count ?? 0))
  if (c === 0) return '0'
  if (c < min) {
    if (c <= 2) return '1~2'
    if (c <= 5) return '3~5'
    return `1~${min - 1}`
  }
  return `${c}`
}

export function maskKeyword(keyword: string) {
  const k = (keyword ?? '').trim()
  if (!k) return '비공개 키워드'
  if (k.length <= 2) return '비공개 키워드'
  if (k.length <= 4) return k[0] + '**'
  return k[0] + '**' + k[k.length - 1]
}

export function shouldHideKeyword(count: number, min: number = MIN_EVIDENCE_SAMPLE) {
  return shouldHideEvidence(count, min)
}

export function tokenize(text: string) {
  return (text ?? '')
    .toLowerCase()
    .replace(/[^0-9a-zA-Z가-힣\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 50)
}
