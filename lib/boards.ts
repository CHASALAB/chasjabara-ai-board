// lib/boards.ts

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}

export type BoardInfo = {
  slug: string   // URL에 쓰는 값
  title: string  // 화면에 보여줄 이름
  db: string     // DB(posts.board / comments.board)에 저장되는 값
}

// ✅ 여기만 너가 쓰는 게시판 이름을 추가하면 됨.
// - key(왼쪽): 사용자가 주소로 들어오는 값(한글/특수문자 OK)
// - slug: URL에 쓰는 값(보통 key랑 같게)
// - title: 화면 표시용
// - db: DB에 저장되는 값(보통 key랑 같게)
const BOARD_MAP: Record<string, BoardInfo> = {
  // 예시 (너가 실제로 쓰는 게시판만 남겨도 됨)
  '징벌': { slug: '징벌', title: '징벌', db: '징벌' },
  '주행': { slug: '주행', title: '주행', db: '주행' },
  '메타': { slug: '메타', title: '메타', db: '메타' },

  // "이 사람 어때?" 게시판 (URL에서는 보통 who로 쓰는 경우)
  'who': { slug: 'who', title: '이 사람 어때?', db: '이 사람 어때?' },
  '이 사람 어때?': { slug: 'who', title: '이 사람 어때?', db: '이 사람 어때?' },
}

// ✅ 중요: 반환 타입을 BoardInfo로 “고정”해서
// page.tsx에서 info.db / info.slug / info.title을 안전하게 쓸 수 있게 함.
export function resolveBoard(raw: string): BoardInfo {
  const decoded = safeDecode(String(raw ?? '')).trim()
  if (!decoded) return { slug: 'unknown', title: '게시판', db: 'unknown' }

  // 1) key로 직접 매칭
  if (BOARD_MAP[decoded]) return BOARD_MAP[decoded]

  // 2) slug로도 매칭 (예: /board/who 로 들어왔을 때)
  const bySlug = Object.values(BOARD_MAP).find((v) => v.slug === decoded)
  if (bySlug) return bySlug

  // 3) 없으면 그대로 사용
  return { slug: decoded, title: decoded, db: decoded }
}
