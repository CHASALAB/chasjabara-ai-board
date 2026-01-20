'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Post = {
  id: string
  board: string
  title: string
  content: string
  author_anon_id: string
  created_at: string
}

function safeDecode(v: string) {
  try { return decodeURIComponent(v) } catch { return v }
}

export default function BoardPage() {
  const params = useParams()
  const rawBoard = (params?.board ?? '') as string
  const board = useMemo(() => safeDecode(rawBoard), [rawBoard])
  const boardSlug = useMemo(() => encodeURIComponent(board), [board])

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('posts')
        .select('*')
        .eq('board', board)
        .eq('hidden', false)
        .order('created_at', { ascending: false })

      setPosts(data ?? [])
      setLoading(false)
    }

    if (board) load()
  }, [board])

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{board} 게시판</h1>
            <a
              href={`/board/${boardSlug}/write`}
              className="px-4 py-2 bg-red-600 rounded-lg text-sm"
            >
              글쓰기
            </a>
          </div>
          <p className="text-zinc-400 text-sm">익명 · Supabase 연동</p>
        </header>

        {loading ? (
          <div className="text-zinc-400">불러오는 중…</div>
        ) : posts.length === 0 ? (
          <div className="bg-zinc-900 rounded-xl p-4 text-zinc-300">
            아직 글이 없습니다.
          </div>
        ) : (
          <section className="space-y-3">
            {posts.map(p => (
              <div key={p.id} className="bg-zinc-900 rounded-xl p-4">
                <a
                  href={`/board/${boardSlug}/post/${p.id}`}
                  className="text-lg font-semibold hover:underline"
                >
                  {p.title}
                </a>
                <div className="text-xs text-zinc-400 mt-1">
                  {new Date(p.created_at).toLocaleString()} · {p.author_anon_id}
                </div>
              </div>
            ))}
          </section>
        )}

        <Link href="/" className="text-sm text-zinc-400">
          ← 메인으로
        </Link>
      </div>
    </main>
  )
}
