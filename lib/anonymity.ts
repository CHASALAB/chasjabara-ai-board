// lib/anonymity.ts
// 익명성/표본 보호용 유틸들

export const MIN_EVIDENCE_SAMPLE = 6

export function shouldHideEvidence(count: number, min: number = MIN_EVIDENCE_SAMPLE) {
  return Number(count ?? 0) < Number(min ?? MIN_EVIDENCE_SAMPLE)
}

// 표본을 그대로 숫자로 안 보여주고 “구간”으로 보여주기(선택)
export function bucketCount(count: number, min: number = MIN_EVIDENCE_SAMPLE) {
  const c = Math.max(0, Number(count ?? 0))
  const m = Math.max(1, Number(min ?? MIN_EVIDENCE_SAMPLE))

  if (c === 0) return '0'
  if (c < m) {
    if (c <= 2) return '1~2'
    if (c <= 5) return '3~5'
    return `1~${m - 1}`
  }
  return `${c}`
}

// 표본이 너무 적으면 키워드 자체도 숨기기
export function shouldHideKeyword(count: number, min: number = MIN_EVIDENCE_SAMPLE) {
  return shouldHideEvidence(count, min)
}

// 키워드 마스킹
export function maskKeyword(keyword: string) {
  const k = (keyword ?? '').trim()
  if (!k) return '비공개 키워드'
  if (k.length <= 2) return '비공개 키워드'
  if (k.length <= 4) return k[0] + '**'
  return k[0] + '**' + k[k.length - 1]
}

// 아주 단순 토크나이저(한글/영문/숫자만 남기고 분리)
export function tokenize(text: string) {
  return (text ?? '')
    .toLowerCase()
    .replace(/[^0-9a-zA-Z가-힣\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 100)
}
