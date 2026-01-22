'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type PostRow = {
  id: string
  board: string
  title: string
  content: string
  author: string | null
  created_at: string
  hidden?: boolean | null
}

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}

export default function BoardPage() {
  const params = useParams()

  // ✅ params 안전 처리 (string | string[] | undefined)
  const rawBoardAny = (params as any)?.board
  const rawBoard = useMemo(() => {
    if (Array.isArray(rawBoardAny)) return rawBoardAny[0] ?? ''
    return typeof rawBoardAny === 'string' ? rawBoardAny : ''
  }, [rawBoardAny])

  const board = useMemo(() => safeDecode(rawBoard).trim(), [rawBoard])
  const boardSlug = useMemo(() => encodeURIComponent(board), [board])

  const [posts, setPosts] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setErrorMsg('')

      const { data, error } = await supabase
        .from('posts')
        .select('id, board, title, content, author, created_at, hidden')
        .eq('board', board)
        .eq('hidden', false)
        .order('created_at', { ascending: false })

      if (!mounted) return

      if (error) {
        setErrorMsg(error.message ?? '게시글을 불러오지 못했습니다.')
        setPosts([])
      } else {
        setPosts((data ?? []) as PostRow[])
      }

      setLoading(false)
    }

    if (!board) {
      setPosts([])
      setLoading(false)
      return
    }

    load()
    return () => {
      mounted = false
    }
  }, [board])

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">{board} 게시판</h1>

            <Link
              href={`/board/${boardSlug}/write`}
              className="rounded-lg px-4 py-2 bg-red-600 hover:bg-red-700 text-sm"
            >
              글쓰기
            </Link>
          </div>

          <p className="text-zinc-400 text-sm">
            이 게시판은 익명 기반으로 운영됩니다.
          </p>
        </header>

        {loading ? (
          <section className="bg-zinc-900 rounded-xl p-4 text-zinc-300">
            불러오는 중...
          </section>
        ) : errorMsg ? (
          <section className="bg-zinc-900 rounded-xl p-4 text-red-300">
            에러: {errorMsg}
          </section>
        ) : posts.length === 0 ? (
          <section className="bg-zinc-900 rounded-xl p-4 text-zinc-300">
            아직 게시글이 없습니다.<br />
            오른쪽 상단 <b>글쓰기</b> 버튼으로 첫 글을 작성해보세요.
          </section>
        ) : (
          <section className="space-y-3">
            {posts.map((p) => (
              <Link
                key={p.id}
                href={`/board/${boardSlug}/post/${p.id}`}
                className="block bg-zinc-900 rounded-xl p-4 hover:bg-zinc-800 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold">{p.title}</div>
                  <div className="text-xs text-zinc-400">
                    {new Date(p.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="mt-2 text-zinc-200 line-clamp-2 whitespace-pre-line">
                  {p.content}
                </div>

                <div className="mt-3 text-xs text-zinc-500">
                  작성자: 익명
                </div>
              </Link>
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
