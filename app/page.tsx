'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import SiteHeader from '@/app/components/SiteHeader'
import NoticeBanner from '@/app/components/NoticeBanner'

const BOARDS = ['징벌', '주행', '서폿', '자유', '이 사람 어때?'] as const

export default function HomePage() {
  const [custom, setCustom] = useState('')

  const list = useMemo(() => [...BOARDS], [])

  function goBoard(name: string) {
    const n = (name ?? '').trim()
    if (!n) return
    window.location.href = `/board/${encodeURIComponent(n)}`
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <SiteHeader />
        <NoticeBanner />

        <section className="bg-zinc-900 rounded-xl p-4 space-y-3">
          <h1 className="text-2xl font-bold">테일즈런너 차사잡아라 AI 익명 게시판</h1>
          <p className="text-zinc-300 leading-relaxed">
            이 사이트는 챗지피티 AI 기준으로 만들었으며 그 유저의 정보가 많이 없을 경우 자세하게 나오지 않을 수 있습니다.
            정보가 쌓일수록 더 정확하게 그 사람의 스타일을 알려줍니다. 익명의 게시판이며 자유롭게 이용하셨으면 합니다.
            <br />
            <br />
            테일즈런너 차사잡아라 유저분들 모두모두 행복한 한판을 즐겼으면 합니다.
          </p>

          {/* ✅ 메인 바로가기 버튼들 */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              href="/trend"
              className="rounded-lg px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm"
            >
              트렌드
            </Link>

            <Link
              href="/trend/rising"
              className="rounded-lg px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm"
            >
              급상승
            </Link>

            <Link
              href="/rules"
              className="rounded-lg px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-sm text-zinc-200"
            >
              운영규칙
            </Link>
          </div>
        </section>

        {/* ✅ 기본 게시판 바로가기 */}
        <section className="bg-zinc-900 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">게시판</h2>
            <span className="text-xs text-zinc-500">완전 익명</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {list.map((b) => (
              <Link
                key={b}
                href={`/board/${encodeURIComponent(b)}`}
                className="rounded-lg px-4 py-2 bg-zinc-950/40 hover:bg-zinc-950/70 text-sm"
              >
                {b}
              </Link>
            ))}
          </div>

          {/* ✅ 커스텀 게시판 이동 */}
          <div className="pt-2 space-y-2">
            <div className="text-sm text-zinc-300">직접 게시판 이름 입력해서 이동</div>
            <div className="flex gap-2">
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="예: 메타 / 대회 / 자유2 ..."
                className="flex-1 rounded-lg bg-zinc-950/40 border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-zinc-600"
              />
              <button
                onClick={() => goBoard(custom)}
                className="rounded-lg px-4 py-2 bg-red-600 hover:bg-red-700 text-sm"
              >
                이동
              </button>
            </div>
          </div>
        </section>

        <div className="text-xs text-zinc-500">
          ※ 익명 보호를 위해 표본이 적은 키워드/근거는 일부 숨김 처리될 수 있습니다.
        </div>
      </div>
    </main>
  )
}
