'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Post = {
  id: string
  board: string
  title: string
  content: string
  author: string
  createdAt: number
}

function safeDecode(v: string) {
  try { return decodeURIComponent(v) } catch { return v }
}

export default function BoardPage() {
  const params = useParams()
  const rawBoard = (params?.board ?? '') as string

  // 사람이 읽는 게시판명
  const board = useMemo(() => safeDecode(rawBoard), [rawBoard])
  // URL용 슬러그(딱 1번만 인코딩)
  const boardSlug = useMemo(() => encodeURIComponent(board), [board])

  const storageKey = useMemo(() => `chasjabara_posts_${board}`, [board])
  const [posts, setPosts] = useState<Post[]>([])

  useEffect(() => {
    if (!board) return
    try {
      const arr = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as Post[]
      setPosts(arr)
    } catch {
      setPosts([])
    }
  }, [board, storageKey])

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">{board} 게시판</h1>

            {/* Next 라우팅 꼬임 방지: a href로 확실하게 이동 */}
            <a
              href={`/board/${boardSlug}/write`}
              className="rounded-lg px-4 py-2 bg-red-600 hover:bg-red-700 text-sm"
            >
              글쓰기
            </a>
          </div>

          <p className="text-zinc-400 text-sm">이 게시판은 익명 기반으로 운영됩니다.</p>
        </header>

        {posts.length === 0 ? (
          <section className="bg-zinc-900 rounded-xl p-4 text-zinc-300">
            아직 게시글이 없습니다.<br />
            오른쪽 상단 <b>글쓰기</b> 버튼으로 첫 글을 작성해보세요.
          </section>
        ) : (
          <section className="space-y-3">
            {posts.map((p) => (
              <div key={p.id} className="bg-zinc-900 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  {/* ✅ 제목 클릭 → 상세페이지 */}
                  <a
                    href={`/board/${boardSlug}/post/${p.id}`}
                    className="text-lg font-semibold hover:underline"
                  >
                    {p.title}
                  </a>

                  <div className="text-xs text-zinc-400">
                    {new Date(p.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="mt-2 whitespace-pre-line text-zinc-200">{p.content}</div>
                <div className="mt-3 text-xs text-zinc-500">작성자: {p.author}</div>
              </div>
            ))}
          </section>
        )}

        <Link href="/" className="inline-block text-sm text-zinc-400 hover:text-zinc-200">
          ← 메인으로 돌아가기
        </Link>
      </div>
    </main>
  )
}
