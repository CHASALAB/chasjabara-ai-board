'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import SiteHeader from '@/app/components/SiteHeader'
import NoticeBanner from '@/app/components/NoticeBanner'
import { getSupabaseBrowser } from '@/lib/supabase'

type PostRow = {
  id: string
  board: string
  title: string
  content: string
  created_at: string
}

export default function TopicSlugPage() {
  const params = useParams<{ slug: string }>()
  const slug = decodeURIComponent(params?.slug ?? '')

  const supabase = useMemo(() => getSupabaseBrowser(), [])

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [rows, setRows] = useState<PostRow[]>([])

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setErrorMsg('')
      setRows([])

      try {
        // ✅ posts 테이블에서 topic/keyword 기반으로 찾는 구조였을 텐데,
        //    지금은 "slug"를 키워드로 사용해서 제목/본문에서 검색하는 기본형으로 둠
        const { data, error } = await supabase
          .from('posts')
          .select('id, board, title, content, created_at')
          .or(`title.ilike.%${slug}%,content.ilike.%${slug}%`)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error
        if (!mounted) return

        setRows((data ?? []) as PostRow[])
      } catch (e: any) {
        if (!mounted) return
        setErrorMsg(e?.message ?? '불러오기 실패')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    if (slug) load()
    return () => {
      mounted = false
    }
  }, [slug, supabase])

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <SiteHeader />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">토픽: {slug}</h1>
          <Link href="/" className="text-sm text-zinc-300 hover:text-white">
            ← 메인
          </Link>
        </div>

        <NoticeBanner />

        {loading && (
          <div className="bg-zinc-900 rounded-xl p-4 text-zinc-300">
            불러오는 중…
          </div>
        )}

        {!loading && errorMsg && (
          <div className="bg-zinc-900 rounded-xl p-4 text-zinc-300">
            <div className="font-semibold mb-1">불러오기 실패</div>
            <div className="text-zinc-400 text-sm whitespace-pre-line">{errorMsg}</div>
          </div>
        )}

        {!loading && !errorMsg && (
          <section className="bg-zinc-900 rounded-xl p-4">
            {rows.length === 0 ? (
              <div className="text-zinc-300">관련 글이 없습니다.</div>
            ) : (
              <ul className="space-y-2">
                {rows.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-lg bg-zinc-950/40 px-3 py-2 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{p.title}</div>
                      <span className="text-xs text-zinc-500">{p.board}</span>
                    </div>

                    <div className="text-sm text-zinc-300 line-clamp-2 whitespace-pre-wrap">
                      {p.content}
                    </div>

                    <div className="text-xs text-zinc-500 flex items-center justify-between">
                      <span>{new Date(p.created_at).toLocaleString('ko-KR')}</span>
                      <Link
                        href={`/board/${encodeURIComponent(p.board)}/post/${p.id}`}
                        className="text-zinc-300 hover:text-white"
                      >
                        상세보기 →
                      </Link>
                    </div>
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
