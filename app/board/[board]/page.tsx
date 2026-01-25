'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import SiteHeader from '@/app/components/SiteHeader'
import NoticeBanner from '@/app/components/NoticeBanner'

import { getSupabaseBrowser } from '@/lib/supabase'
import { resolveBoard } from '@/lib/boards'

type PostRow = {
  id: string
  board: string | null
  title: string | null
  content: string | null
  author_anon_id: string | null
  created_at: string | null
  is_hidden?: boolean | null
}

export default function BoardPage() {
  const params = useParams()
  const rawBoard = (params?.board as string) ?? ''
  const info = useMemo(() => resolveBoard(rawBoard), [rawBoard])

  const boardSlug = useMemo(() => encodeURIComponent(info.slug), [info.slug])

  const supabase = useMemo(() => getSupabaseBrowser(), [])

  const [posts, setPosts] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setMsg('')
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('id, board, title, content, author_anon_id, created_at, is_hidden')
          .eq('board', info.db)
          .eq('is_hidden', false)
          .order('created_at', { ascending: false })
          .limit(50)

        if (!mounted) return
        if (error) throw error
        setPosts((data ?? []) as PostRow[])
      } catch (e: any) {
        if (!mounted) return
        setMsg(e?.message ?? '불러오기 실패')
        setPosts([])
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [supabase, info.db])

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <SiteHeader />

        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{info.title} 게시판</h1>

          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-zinc-300 hover:text-white">
              ← 메인
            </Link>
            <Link
              href={`/board/${boardSlug}/write`}
              className="text-sm bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg"
            >
              글쓰기
            </Link>
          </div>
        </div>

        <NoticeBanner />

        {loading && (
          <div className="bg-zinc-900 rounded-xl p-4 text-zinc-300">불러오는 중…</div>
        )}

        {!loading && msg && (
          <div className="bg-zinc-900 rounded-xl p-4 text-zinc-300">
            불러오기 실패: <span className="text-zinc-400">{msg}</span>
          </div>
        )}

        {!loading && !msg && (
          <section className="bg-zinc-900 rounded-xl p-4">
            {posts.length === 0 ? (
              <div className="text-zinc-300">아직 글이 없습니다.</div>
            ) : (
              <ul className="space-y-2">
                {posts.map((p) => (
                  <li key={p.id} className="rounded-lg bg-zinc-950/40 px-3 py-3">
                    <Link
                      href={`/board/${boardSlug}/post/${p.id}`}
                      className="block space-y-1"
                    >
                      <div className="font-semibold">
                        {p.title?.trim() ? p.title : '(제목 없음)'}
                      </div>
                      {p.content?.trim() ? (
                        <div className="text-sm text-zinc-300 line-clamp-2">
                          {p.content}
                        </div>
                      ) : (
                        <div className="text-sm text-zinc-500">(내용 없음)</div>
                      )}
                      <div className="text-xs text-zinc-500">
                        {p.created_at ? new Date(p.created_at).toLocaleString('ko-KR') : ''}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
