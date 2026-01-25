// lib/boards.ts

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}

export type BoardInfo = {
  // ✅ 과거 코드 호환용(name) + 앞으로 표준(title)
  name: string
  title: string
  // ✅ URL에 쓰는 값(한글 OK)
  slug: string
  // ✅ DB(posts.board / comments.board)에 들어가는 값
  db: string
}

// ✅ 여기만 너가 쓰는 게시판 이름 적으면 됨.
// - key: 주소로 들어오는 값(한글 가능)
// - value.db: DB에 저장되는 값(보통 key 그대로)
// - value.slug: URL에 쓰는 값(보통 key 그대로)
// - value.title/name: 화면 표시용
const BOARD_MAP: Record<string, BoardInfo> = {
  // 너가 쓰는 것들(필요하면 더 추가)
  '징벌': { slug: '징벌', title: '징벌', name: '징벌', db: '징벌' },
  '주행': { slug: '주행', title: '주행', name: '주행', db: '주행' },
  '이 사람 어때?': { slug: '이 사람 어때?', title: '이 사람 어때?', name: '이 사람 어때?', db: '이 사람 어때?' },

  // 영문 alias도 필요하면 이렇게
  who: { slug: 'who', title: '이 사람 어때?', name: '이 사람 어때?', db: '이 사람 어때?' },
}

export function resolveBoard(raw: string): BoardInfo {
  const decoded = safeDecode((raw ?? '').trim())
  if (!decoded) {
    return { slug: 'unknown', title: 'unknown', name: 'unknown', db: 'unknown' }
  }

  // 정확히 매핑된 값 있으면 사용
  const hit = BOARD_MAP[decoded]
  if (hit) return hit

  // 없으면 “그대로” 보드로 취급 (새 게시판 자동 생성 느낌)
  return { slug: decoded, title: decoded, name: decoded, db: decoded }
}
