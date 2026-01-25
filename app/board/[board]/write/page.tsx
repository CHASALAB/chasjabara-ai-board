'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { requireSupabaseBrowser } from '@/lib/supabase'
import { resolveBoard } from '@/lib/boards'

export default function WritePage() {
  const params = useParams()
  const router = useRouter()
  const rawBoard = (params?.board ?? '') as string

  const info = useMemo(() => resolveBoard(rawBoard), [rawBoard])
  const boardSlug = useMemo(() => encodeURIComponent(info.slug), [info.slug])

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  async function onSubmit() {
    if (!title.trim() || !content.trim()) return
    setSaving(true)

    const author_anon_id =
      localStorage.getItem('chasjabara_anon_id') ?? `anon_${crypto.randomUUID().slice(0, 8)}`
    localStorage.setItem('chasjabara_anon_id', author_anon_id)

    const supabase = requireSupabaseBrowser()

    const { error } = await supabase.from('posts').insert({
      board: info.db,
      title: title.trim(),
      content: content.trim(),
      author_anon_id,
    })

    setSaving(false)

    if (error) {
      alert(`등록 실패: ${error.message}`)
      return
    }

    router.push(`/board/${boardSlug}`)
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">{info.title} 글쓰기</h1>
          <p className="text-sm text-zinc-400">익명으로 작성됩니다.</p>
        </header>

        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            className="w-full rounded-xl bg-zinc-900 px-4 py-3 outline-none"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용"
            rows={10}
            className="w-full rounded-xl bg-zinc-900 px-4 py-3 outline-none"
          />
          <button
            onClick={onSubmit}
            disabled={saving}
            className="rounded-lg px-4 py-2 bg-red-600 hover:bg-red-700 text-sm disabled:opacity-50"
          >
            {saving ? '등록 중...' : '등록'}
          </button>
        </div>

        <Link
          href={`/board/${boardSlug}`}
          className="inline-block text-sm text-zinc-400 hover:text-zinc-200"
        >
          ← 게시판으로
        </Link>
      </div>
    </main>
  )
}
