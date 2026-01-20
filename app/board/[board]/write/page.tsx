'use client'

import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'

function getOrCreateAnonId() {
  const key = 'chasjabara_anon_id'
  let v = localStorage.getItem(key)
  if (!v) {
    v = `anon_${crypto.randomUUID().slice(0, 8)}`
    localStorage.setItem(key, v)
  }
  return v
}

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}

type Post = {
  id: string
  board: string
  title: string
  content: string
  author: string
  createdAt: number
}

export default function WritePage() {
  const params = useParams()
  const rawBoard = (params?.board ?? '') as string

  // ✅ 사람이 읽는 게시판명으로 통일
  const board = useMemo(() => safeDecode(rawBoard), [rawBoard])
  // ✅ 링크/이동용 slug는 1번만 인코딩
  const boardSlug = useMemo(() => encodeURIComponent(board), [board])

  const anonId = useMemo(() => (typeof window !== 'undefined' ? getOrCreateAnonId() : ''), [])

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  // ✅ 저장 키도 board(디코딩) 기준으로 통일 (목록 페이지와 동일해야 글이 보임)
  const storageKey = useMemo(() => `chasjabara_posts_${board}`, [board])

  const submit = () => {
    setError(null)
    if (!title.trim()) return setError('제목을 입력해줘.')
    if (!content.trim()) return setError('내용을 입력해줘.')

    const post: Post = {
      id: crypto.randomUUID(),
      board,
      title: title.trim(),
      content: content.trim(),
      author: anonId,
      createdAt: Date.now(),
    }

    const prev = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as Post[]
    localStorage.setItem(storageKey, JSON.stringify([post, ...prev]))

    // ✅ Next 라우팅 대신 확실한 이동(새로고침 이동)
    window.location.href = `/board/${boardSlug}`
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-5">
        <h1 className="text-2xl font-bold">{board} 글쓰기</h1>
        <p className="text-sm text-zinc-400">익명 ID: {anonId}</p>

        <div className="space-y-3 bg-zinc-900 rounded-xl p-4">
          <input
            className="w-full rounded-lg px-3 py-2 text-black"
            placeholder="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full rounded-lg px-3 py-2 text-black min-h-[180px]"
            placeholder="내용"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          {error && <div className="text-sm text-red-300">{error}</div>}

          <div className="flex gap-2">
            <button
              onClick={submit}
              className="rounded-lg px-4 py-2 bg-red-600 hover:bg-red-700"
            >
              등록
            </button>
            <a
              href={`/board/${boardSlug}`}
              className="rounded-lg px-4 py-2 bg-zinc-700 hover:bg-zinc-600 inline-flex items-center"
            >
              취소
            </a>
          </div>

          <p className="text-xs text-zinc-500">
            ※ 현재는 브라우저(로컬)에 임시 저장됩니다. 다음 단계에서 서버 DB(Supabase)로 이동합니다.
          </p>
        </div>
      </div>
    </main>
  )
}
