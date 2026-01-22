// lib/anonymize.ts
// ✅ 완전 익명용: 닉네임/식별정보로 보일 수 있는 문자열을 최대한 가림 처리
// (너무 공격적이면 나중에 규칙 완화 가능)

const KOREAN_TLRN_KEYWORDS = [
  '테일즈런너', '차사잡아라', '차사', '징벌', '주행', '서폿', '메타'
]

// “가릴지” 판단용: 너무 짧은 단어는 과도하게 가릴 수 있으니 제외
function looksLikeNickname(token: string) {
  if (!token) return false
  const t = token.trim()

  // 2글자 미만은 보통 의미단어도 많아서 제외
  if (t.length < 3) return false

  // 너무 긴 건 보통 문장/URL이라 제외(필요하면 조절)
  if (t.length > 16) return false

  // 포함되면 닉네임으로 보기 애매한 키워드 제외
  if (KOREAN_TLRN_KEYWORDS.some((k) => t.includes(k))) return false

  // 영문/숫자 혼합(게임닉에 흔함)
  const hasLetter = /[A-Za-z]/.test(t)
  const hasDigit = /\d/.test(t)
  const hasHangul = /[가-힣]/.test(t)

  // 한글만 3~8자(닉네임 흔함)
  if (hasHangul && !hasLetter && !hasDigit && t.length <= 8) return true

  // 영문+숫자 조합, 혹은 영문만 3~12자
  if ((hasLetter && hasDigit) || (hasLetter && t.length <= 12)) return true

  // 특수문자 포함한 닉네임 패턴
  if (/[_\-\.]/.test(t) && (hasLetter || hasHangul)) return true

  return false
}

function maskToken(token: string) {
  // 길이 보존 느낌만 주고 마스킹
  if (token.length <= 4) return '***'
  if (token.length <= 8) return token[0] + '***'
  return token.slice(0, 2) + '***'
}

// 텍스트에서 “닉네임으로 보이는 토큰”만 가림
export function anonymizeText(input: string) {
  if (!input) return input

  // URL은 그대로 두는 게 보통 더 낫지만, 닉네임이 URL에 섞이면 위험 → 기본은 유지
  // 필요하면 URL도 마스킹 가능
  const parts = input.split(/(\s+)/) // 공백 유지
  return parts
    .map((p) => {
      // 공백은 그대로
      if (/^\s+$/.test(p)) return p

      // 토큰에서 앞뒤 구두점 떼고 판별
      const m = p.match(/^([("'[\{<]*)(.*?)([)"'\]\}>.,!?;:]*)$/)
      if (!m) return p
      const lead = m[1] ?? ''
      const core = m[2] ?? ''
      const tail = m[3] ?? ''

      if (looksLikeNickname(core)) {
        return `${lead}${maskToken(core)}${tail}`
      }
      return p
    })
    .join('')
}
