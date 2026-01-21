'use client'

import Link from 'next/link'

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur border-b border-zinc-800">
      <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-white">
          차사잡아라 AI 익명 게시판
        </Link>

        <nav className="flex gap-3 text-sm">
          <Link href="/trend" className="text-zinc-300 hover:text-white">
            트렌드
          </Link>
          <Link href="/rules" className="text-zinc-300 hover:text-white">
            운영규칙
          </Link>
        </nav>
      </div>
    </header>
  )
}
