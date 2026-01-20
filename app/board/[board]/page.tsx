'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type PostRow = {
  id: string
  board: string
  title: string
  author_anon_id: string
  created_at: string
  report_count: number | null
}

function safeDecode(v: string) {
  try { return decodeURIComponent(v) } catch { return v }
}

function getAnonId() {
  const key = 'chasjabara_anon_id'
  let v = localStorage.getItem(key)
  if (!v) {
    v = `anon_${crypto.randomUUID().slice(0, 8)}`
    localStorage.setItem(key, v)
  }
  return v
}

export default function BoardPage() {
  const params = useParams()
  const rawBoard = (params?.board ?? '') as string
  const board = useMemo(() => safeDecode(rawBoard), [rawBoard])
  const boardSlug = useMemo(() => encodeURIComponent(board), [board])

  const anonId = useMemo(() => getAnonId(), [])

  const [posts, setPosts] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select('id,board,title,author_anon_id,created_at,report_count')
      .eq('board', board)
      .eq('hidden', false)
      .order('created_at', { ascending: false })

    if (error) {
      setToast(`[Supabase] ${error.message}`)
      setPosts([])
      setLoading(false)
      return
    }

    setPosts((data ?? []) as PostRow[])
    setLoading(false)
  }

  useEffect(() => {
    if (board) load()
  }, [board])

  const reportPost = async (postId: string) => {
    setToast(null)
    const { error } = await supabase.from('post_reports').insert({
      post_id: postId,
      reporter_anon_id: anonId,
    })

    if (error) {
      setToast('이미 신고했거나, 잠시 후 다시 시도해줘.')
      return
    }

    setToast('신고 접수됨. (누적 3회면 자동 숨김)')
    await load()
  }

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

          <p className="text-xs text-zinc-400">
            ※ 실명/비방 금지 · 신고 3회 누적 시 자동 숨김
          </p>

          {toast && <div className="text-sm text-emerald-300 whitespace-pre-line">{toast}</div>}
        </header>

        {loading ? (
          <div className="text-zinc-400">불러오는 중…</div>
        ) : posts.length === 0 ? (
          <div className="bg-zinc-900 rounded-xl p-4 text-zinc-300">
            아직 글이 없습니다.
          </div>
        ) : (
          <section className="space-y-3">
            {posts.map((p) => (
              <div key={p.id} className="bg-zinc-900 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <a
                    href={`/board/${boardSlug}/post/${p.id}`}
                    className="text-lg font-semibold hover:underline"
                  >
                    {p.title}
                  </a>

                  <button
                    type="button"
                    onClick={() => reportPost(p.id)}
                    className="text-xs px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
                    title="신고 3회 누적 시 자동 숨김"
                  >
                    신고 ({p.report_count ?? 0})
                  </button>
                </div>

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
