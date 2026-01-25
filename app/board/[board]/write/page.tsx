'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import SiteHeader from '@/app/components/SiteHeader'
import NoticeBanner from '@/app/components/NoticeBanner'

import { getSupabaseBrowser } from '@/lib/supabase'
import { resolveBoard } from '@/lib/boards'

export default function WritePage() {
  const router = useRouter()
  const params = useParams()
  const rawBoard = (params?.board as string) ?? ''
  const info = useMemo(() => resolveBoard(rawBoard), [rawBoard])

  const boardSlug = useMemo(() => encodeURIComponent(info.slug), [info.slug])

  const supabase = useMemo(() => getSupabaseBrowser(), [])

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function onSubmit() {
    if (loading) return
    setLoading(true)
    setMsg('')

    try {
      const t = title.trim()
      const c = content.trim()
      if (!t || !c) {
        setMsg('제목/본문을 입력해 주세요.')
        return
      }

      const { data, error } = await supabase
        .from('posts')
        .insert({
          board: info.db, // ✅ DB 저장값은 info.db
          title: t,
          content: c,
        })
        .select('id')
        .single()

      if (error) throw error

      const id = data?.id
      if (!id) {
        setMsg('등록은 되었는데 id를 못 받았어요. 새로고침 후 확인해 주세요.')
        return
      }

      // ✅ URL에는 문자열인 boardSlug 사용
      router.push(`/board/${boardSlug}/post/${id}`)
    } catch (e: any) {
      setMsg(`등록 실패: ${e?.message ?? '알 수 없는 오류'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <SiteHeader />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{info.title} 글쓰기</h1>

          <Link href={`/board/${boardSlug}`} className="text-sm text-zinc-300 hover:text-white">
            ← 게시판
          </Link>
        </div>

        <NoticeBanner />

        <section className="bg-zinc-900 rounded-xl p-4 space-y-3">
          <input
            className="w-full rounded-lg bg-zinc-950/40 px-3 py-2 outline-none"
            placeholder="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            className="w-full min-h-[220px] rounded-lg bg-zinc-950/40 px-3 py-2 outline-none"
            placeholder="본문"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {msg && <div className="text-sm text-zinc-300">{msg}</div>}

          <button
            onClick={onSubmit}
            disabled={loading}
            className="w-full rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-2 disabled:opacity-50"
          >
            {loading ? '등록 중…' : '등록'}
          </button>
        </section>
      </div>
    </main>
  )
}

