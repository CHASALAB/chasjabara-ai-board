'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

type Post = {
  id: string
  board: string
  title: string
  content: string
  author: string
  createdAt: number
}

type Comment = {
  id: string
  postId: string
  content: string
  author: string
  createdAt: number
}

function getOrCreateAnonId() {
  const key = 'chasjabara_anon_id'
  let v = localStorage.getItem(key)
  if (!v) {
    v = `anon_${crypto.randomUUID().slice(0, 8)}`
    localStorage.setItem(key, v)
  }
  return v
}

function safeDecode(v: string) {
  try { return decodeURIComponent(v) } catch { return v }
}

export default function Home() {
  const intro = `이 사이트는 ChatGPT AI 기준으로 만들었으며 그 유저의 정보가 많이 없을 경우 자세하게 나오지 않을 수 있습니다.
정보가 쌓일수록 더 정확하게 그 사람의 스타일을 알려줍니다.
익명의 게시판이며 자유롭게 이용하셨으면 합니다.

테일즈런너 차사잡아라 유저분들 모두모두 행복한 한 판을 즐겼으면 합니다.`

  const boards = [
    { name: '징벌', path: '/board/징벌', desc: '징벌 플레이/루트/타이밍 토론' },
    { name: '일반', path: '/board/일반', desc: '일반 차사 운영/생존/상대법' },
    { name: '논란', path: '/board/논란', desc: '이슈 정리(팩트 기반)' },
    { name: '메타', path: '/board/메타', desc: '패치 후 메타/빌드 분석' },
  ]

  const anonId = useMemo(() => (typeof window !== 'undefined' ? getOrCreateAnonId() : ''), [])

  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)

  const analyze = async () => {
    const q = nickname.trim()
    if (!q) return

    setLoading(true)
    setSummary(null)

    // 로컬 데이터에서 닉네임 언급 수집
    const allPosts: Post[] = []
    for (const b of boards) {
      const boardName = safeDecode(b.name)
      const key = `chasjabara_posts_${boardName}`
      try {
        const arr = JSON.parse(localStorage.getItem(key) ?? '[]') as Post[]
        allPosts.push(...arr)
      } catch {}
    }

    const matchedPosts = allPosts.filter(p =>
      (p.title + '\n' + p.content).toLowerCase().includes(q.toLowerCase())
    )

    // 댓글 수집 (postId 기반 키)
    const matchedComments: Comment[] = []
    for (const p of matchedPosts) {
      const cKey = `chasjabara_comments_${p.id}`
      try {
        const carr = JSON.parse(localStorage.getItem(cKey) ?? '[]') as Comment[]
        matchedComments.push(
          ...carr.filter(c => c.content.toLowerCase().includes(q.toLowerCase()))
        )
      } catch {}
    }

    // 요약 생성 (안전한 룰 기반)
    const mentionCount = matchedPosts.length + matchedComments.length

    if (mentionCount < 3) {
      setSummary(
        `데이터가 부족해서 상세 분석이 어렵습니다.\n` +
        `현재 수집된 언급: ${mentionCount}개\n\n` +
        `게시판에 의견/댓글이 더 쌓이면 더 정확해집니다.`
      )
      setLoading(false)
      return
    }

    // 간단한 경향 분석(키워드 기반)
    const textPool = [
      ...matchedPosts.map(p => p.content),
      ...matchedComments.map(c => c.content),
    ].join('\n')

    const tags: string[] = []
    if (textPool.includes('안정')) tags.push('안정형')
    if (textPool.includes('무리')) tags.push('공격성')
    if (textPool.includes('팀') || textPool.includes('커버') || textPool.includes('서폿')) tags.push('팀플')
    if (textPool.includes('후반')) tags.push('후반 운영')
    if (textPool.includes('징') || textPool.includes('징벌')) tags.push('징벌 관련')

    const tagLine = tags.length ? `키워드 경향: ${Array.from(new Set(tags)).join(' / ')}` : '키워드 경향: (데이터 기반으로 추가 예정)'

    setSummary(
      `커뮤니티 언급 ${mentionCount}개 기준 자동 요약입니다.\n\n` +
      `- ${tagLine}\n` +
      `- 이 분석은 “개인 평가”가 아니라, 게시판에 쌓인 의견의 요약입니다.\n` +
      `- 의견이 더 쌓일수록 더 정확해집니다.`
    )

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold">테일즈런너 차사잡아라 AI 익명 게시판</h1>
          <p className="text-zinc-300 whitespace-pre-line">{intro}</p>
          <p className="text-xs text-zinc-500">
            ※ 분석/정리는 개인 평가가 아닌, 게시판 의견의 구조적 요약입니다.
          </p>
        </header>

        <section className="bg-zinc-900 rounded-xl p-4 space-y-3">
          <div className="text-sm text-zinc-300">
            내 익명 ID: <span className="text-zinc-100">{anonId}</span>
          </div>

          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg px-3 py-2 text-black"
              placeholder="닉네임 입력 (예: TimeLeap)"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <button
              type="button"
              onClick={analyze}
              disabled={loading}
              className="rounded-lg px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? '분석중…' : '이 사람 어때?'}
            </button>
          </div>

          {summary && (
            <div className="bg-zinc-950 rounded-lg p-3 text-zinc-200 whitespace-pre-line">
              {summary}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {boards.map((b) => (
            <Link
              key={b.path}
              href={b.path}
              className="rounded-xl bg-zinc-900 p-4 hover:bg-zinc-800 transition"
            >
              <div className="text-lg font-semibold">{b.name} 게시판</div>
              <div className="text-sm text-zinc-300 mt-1">{b.desc}</div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}
