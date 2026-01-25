'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase'
import { resolveBoard } from '@/lib/boards'

type PostRow = {
  id: string
  board: string
  title: string
  content: string
  author_anon_id: string
  created_at: string
  is_hidden?: boolean
}

export default function BoardPage() {
  const params = useParams()
  const rawBoard = (params?.board ?? '') as string

const info = useMemo(() => resolveBoard(rawBoard), [rawBoard])
const boardName = info.name
const boardSlug = info.slug


  const [posts, setPosts] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    ;(async () => {
      setLoading(true)
      setErr(null)

      const supabase = getSupabaseBrowser()
      if (!supabase) {
        if (!mounted) return
        setErr('Supabase 환경변수를 읽지 못했습니다. (.env.local / 재시작 확인)')
        setPosts([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('posts')
        .select('id, board, title, content, author_anon_id, created_at, is_hidden')
        .eq('board', info.db)
        .order('created_at', { ascending: false })

      if (!mounted) return

      if (error) {
        console.error('posts load error:', error)
        setErr(`불러오기 실패: ${error.message}`)
        setPosts([])
      } else {
        setPosts((data ?? []).filter((p) => !p.is_hidden))
      }

      setLoading(false)
    })()

    return () => {
      mounted = false
    }
  }, [info.db])

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">{info.title} 게시판</h1>

            <Link
              href={`/board/${boardSlug}/write`}
              className="rounded-lg px-4 py-2 bg-red-600 hover:bg-red-700 text-sm"
            >
              글쓰기
            </Link>
          </div>

          <p className="text-zinc-400 text-sm">이 게시판은 익명 기반으로 운영됩니다.</p>
        </header>

        {loading ? (
          <section className="bg-zinc-900 rounded-xl p-4 text-zinc-300">불러오는 중...</section>
        ) : err ? (
          <section className="bg-zinc-900 rounded-xl p-4 text-zinc-300 whitespace-pre-line">
            {err}
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
                <div className="mt-2 line-clamp-2 whitespace-pre-line text-zinc-200">
                  {p.content}
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
