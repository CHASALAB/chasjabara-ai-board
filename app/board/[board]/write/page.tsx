'use client'

import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

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

export default function WritePage() {
  const params = useParams()
  const rawBoard = (params?.board ?? '') as string
  const board = useMemo(() => safeDecode(rawBoard), [rawBoard])
  const boardSlug = useMemo(() => encodeURIComponent(board), [board])

  const anonId = useMemo(() => getAnonId(), [])

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {console.log('SUPABASE_URL=', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('ANON_KEY_HEAD=', (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').slice(0, 20))

    setError(null)
    if (!title.trim()) return setError('제목을 입력하세요.')
    if (!content.trim()) return setError('내용을 입력하세요.')

    setLoading(true)

    const { error } = await supabase.from('posts').insert({
      board,
      title,
      content,
      author_anon_id: anonId,
    })

    setLoading(false)

   if (error) {
  setError(`[Supabase] ${error.message} (code: ${error.code ?? 'n/a'})`)
  console.error(error)
  return
}


    window.location.href = `/board/${boardSlug}`
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">{board} 글쓰기</h1>

        <input
          className="w-full rounded px-3 py-2 text-black"
          placeholder="제목"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        <textarea
          className="w-full rounded px-3 py-2 text-black min-h-[180px]"
          placeholder="내용"
          value={content}
          onChange={e => setContent(e.target.value)}
        />

        {error && <div className="text-sm text-red-400">{error}</div>}

        <button
          onClick={submit}
          disabled={loading}
          className="px-4 py-2 bg-red-600 rounded"
        >
          {loading ? '저장 중…' : '등록'}
        </button>
      </div>
    </main>
  )
}
