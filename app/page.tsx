'use client'

import Link from 'next/link'

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

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold">테일즈런너 차사잡아라 AI 익명 게시판</h1>
          <p className="text-zinc-300 whitespace-pre-line">{intro}</p>
          <p className="text-xs text-zinc-500">
            ※ 본 사이트의 분석/정리는 개인 평가가 아닌, 게시판에 쌓인 의견의 구조적 요약입니다.
          </p>
        </header>

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

        <section className="text-sm text-zinc-300">
          다음 단계: 게시판에 글/댓글이 쌓이면 <b>“이 사람 어때?”</b> 분석이 더 정확해집니다.
        </section>
      </div>
    </main>
  )
}
