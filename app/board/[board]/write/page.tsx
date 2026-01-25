'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import SiteHeader from '@/app/components/SiteHeader'
import NoticeBanner from '@/app/components/NoticeBanner'

import { getSupabaseBrowser } from '@/lib/supabase'
import { resolveBoard } from '@/lib/boards'

export default function WritePage() {
  const params = useParams()
  const router = useRouter()

  const rawBoard = (params?.board ?? '') as string
  const board = useMemo(() => resolveBoard(rawBoard), [rawBoard])

  const supabase = useMemo(() => getSupabaseBrowser(), [])

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function onSubmit() {
    if (saving) return
    setMsg('')

    const t = title.trim()
    const c = content.trim()
    if (!t || !c) {
      setMsg('제목과 내용을 입력해 주세요.')
      return
    }

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([{ board, title: t, content: c }])
        .select('id')
        .single()

      if (error) throw error

      const id = data?.id
      if (!id) {
        setMsg('등록은 되었는데 id를 못 받았어요. 새로고침 후 확인해 주세요.')
        return
      }

      router.push(`/board/${encodeURIComponent(board)}/post/${id}`)
    } catch (e: any) {
      setMsg(`등록 실패: ${e?.message ?? '알 수 없는 오류'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <SiteHeader />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{board} 글쓰기</h1>
          <Link
            href={`/board/${encodeURIComponent(board)}`}
            className="text-sm text-zinc-300 hover:text-white"
          >
            ← 게시판
          </Link>
        </div>

        <NoticeBanner />

        <section className="bg-zinc-900 rounded-xl p-4 space-y-3">
          <div className="space-y-2">
            <label className="text-sm text-zinc-300">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full rounded-lg bg-zinc-950/40 px-3 py-2 outline-none border border-zinc-800 focus:border-zinc-600"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-300">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              rows={10}
              className="w-full rounded-lg bg-zinc-950/40 px-3 py-2 outline-none border border-zinc-800 focus:border-zinc-600"
            />
          </div>

          {msg && (
            <div className="text-sm text-zinc-300 bg-zinc-950/40 rounded-lg p-3">
              {msg}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onSubmit}
              disabled={saving}
              className="rounded-lg px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-sm"
            >
              {saving ? '등록 중…' : '등록'}
            </button>

            <Link
              href={`/board/${encodeURIComponent(board)}`}
              className="rounded-lg px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm"
            >
              취소
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
