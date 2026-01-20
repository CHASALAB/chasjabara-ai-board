'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type PostRow = {
  id: string
  board: string
  title: string
  content: string
  author_anon_id: string
  created_at: string
}

type CommentRow = {
  id: string
  post_id: string
  content: string
  author_anon_id: string
  created_at: string
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

export default function PostPage() {
  const params = useParams()
  const rawBoard = (params?.board ?? '') as string
  const board = useMemo(() => safeDecode(rawBoard), [rawBoard])
  const boardSlug = useMemo(() => encodeURIComponent(board), [board])

  const id = (params?.id ?? '') as string
  const anonId = useMemo(() => getAnonId(), [])

  const [post, setPost] = useState<PostRow | null>(null)
  const [comments, setComments] = useState<CommentRow[]>([])
  const [loading, setLoading] = useState(true)

  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const loadAll = async () => {
    setLoading(true)

    const { data: p } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .eq('hidden', false)
      .maybeSingle()

    setPost((p as any) ?? null)

    const { data: cs } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', id)
      .eq('hidden', false)
      .order('created_at', { ascending: false })

    setComments((cs as any) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (id) loadAll()
  }, [id])

  const submitComment = async () => {
    setError(null)
    if (!content.trim()) return setError('댓글 내용을 입력해줘.')
    setSending(true)

    const { error } = await supabase.from('comments').insert({
      post_id: id,
      content: content.trim(),
      author_anon_id: anonId,
    })

    setSending(false)

    if (error) {
      setError(`[Supabase] ${error.message}`)
      return
    }

    setContent('')
    loadAll()
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">{board} 게시판</h1>
          <p className="text-sm text-zinc-400">게시글 상세 · 댓글</p>
        </header>

        {loading ? (
          <div className="text-zinc-400">불러오는 중…</div>
        ) : !post ? (
          <section className="bg-zinc-900 rounded-xl p-4 text-zinc-300">
            게시글을 찾을 수 없습니다.
          </section>
        ) : (
          <section className="bg-zinc-900 rounded-xl p-4 space-y-2">
            <div className="text-xl font-semibold">{post.title}</div>
            <div className="text-xs text-zinc-400">
              {new Date(post.created_at).toLocaleString()} · {post.author_anon_id}
            </div>
            <div className="whitespace-pre-line text-zinc-200 mt-3">{post.content}</div>
          </section>
        )}

        {/* 댓글 */}
        <section className="bg-zinc-900 rounded-xl p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">댓글</h2>
            <div className="text-xs text-zinc-500">익명 ID: {anonId}</div>
          </div>

          <textarea
            className="w-full rounded-lg px-3 py-2 text-black min-h-[90px]"
            placeholder="댓글을 입력하세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {error && <div className="text-sm text-red-300">{error}</div>}

          <button
            type="button"
            disabled={sending}
            onClick={submitComment}
            className="rounded-lg px-4 py-2 bg-red-600 hover:bg-red-700 text-sm disabled:opacity-60"
          >
            {sending ? '등록 중…' : '댓글 등록'}
          </button>

          {comments.length === 0 ? (
            <div className="text-sm text-zinc-300">아직 댓글이 없습니다.</div>
          ) : (
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="bg-zinc-950 rounded-lg p-3">
                  <div className="text-xs text-zinc-400 flex justify-between">
                    <span>{c.author_anon_id}</span>
                    <span>{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <div className="mt-2 whitespace-pre-line text-zinc-200">{c.content}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex gap-3 text-sm">
          <a href={`/board/${boardSlug}`} className="text-zinc-400 hover:text-zinc-200">
            ← 목록으로
          </a>
          <Link href="/" className="text-zinc-400 hover:text-zinc-200">
            메인
          </Link>
        </div>
      </div>
    </main>
  )
}
