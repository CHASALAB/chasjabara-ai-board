'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import ReportButton from '@/app/components/ReportButton'

type PostRow = {
  id: string
  board: string | null
  title: string | null
  content: string | null
  author: string | null
  hidden?: boolean | null
  report_count?: number | null
  created_at?: string | null
  createdAt?: number | null
}

type CommentRow = {
  id: string
  post_id: string
  content: string | null
  author: string | null
  hidden?: boolean | null
  report_count?: number | null
  created_at?: string | null
  createdAt?: number | null
}

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}

function formatDate(p: { created_at?: string | null; createdAt?: number | null }) {
  if (p.created_at) return new Date(p.created_at).toLocaleString()
  if (typeof p.createdAt === 'number') return new Date(p.createdAt).toLocaleString()
  return ''
}

function getAnonId() {
  if (typeof window === 'undefined') return 'anon'
  const key = 'chasjabara_anon_id'
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const id = `anon_${Math.random().toString(36).slice(2, 8)}`
  localStorage.setItem(key, id)
  return id
}

export default function PostDetailPage() {
  const params = useParams()

  const rawBoard = (params?.board ?? '') as string
  const rawId = (params?.id ?? '') as string

  const board = useMemo(() => safeDecode(rawBoard), [rawBoard])
  const boardSlug = useMemo(() => encodeURIComponent(board), [board])
  const id = useMemo(() => safeDecode(rawId), [rawId])

  const [loading, setLoading] = useState(true)
  const [post, setPost] = useState<PostRow | null>(null)
  const [comments, setComments] = useState<CommentRow[]>([])
  const [error, setError] = useState<string | null>(null)

  // 댓글 작성
  const [commentText, setCommentText] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      // ✅ 숨김 글은 아예 안 가져오게(hidden=false)
      const { data: postData, error: postErr } = await supabase
        .from('posts')
        .select('id, board, title, content, author, hidden, report_count, created_at, createdAt')
        .eq('id', id)
        .eq('hidden', false)
        .single()

      if (postErr) {
        // 숨김이거나 없는 글이면 single에서 에러가 날 수 있음
        setPost(null)
        setComments([])
        return
      }

      setPost(postData as PostRow)

      // ✅ 숨김 댓글도 안 보이게(hidden=false)
      const { data: commentData, error: cErr } = await supabase
        .from('comments')
        .select('id, post_id, content, author, hidden, report_count, created_at, createdAt')
        .eq('post_id', id)
        .eq('hidden', false)
        .order('created_at', { ascending: true })

      if (cErr) throw cErr
      setComments((commentData ?? []) as CommentRow[])
    } catch (e: any) {
      setError(e?.message ?? '불러오기 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function submitComment() {
    const text = commentText.trim()
    if (!text) return alert('댓글 내용을 입력해주세요.')
    if (!post) return

    setSaving(true)
    try {
      const author = getAnonId()
      const { error } = await supabase.from('comments').insert([
        {
          post_id: post.id,
          content: text,
          author,
          board: board, // comments 테이블에 board 컬럼이 없으면 Supabase가 무시하진 않고 에러낼 수 있음
        } as any,
      ])

      if (error) {
        // comments 테이블에 board 컬럼이 없을 수 있어서 한 번 더 안전 처리
        const { error: error2 } = await supabase.from('comments').insert([
          {
            post_id: post.id,
            content: text,
            author,
          } as any,
        ])
        if (error2) throw error2
      }

      setCommentText('')
      await load()
    } catch (e: any) {
      alert('댓글 등록 실패: ' + (e?.message ?? 'error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Link
              href={`/board/${boardSlug}`}
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              ← {board} 게시판
            </Link>

            {/* ✅ 게시글 신고 버튼 (1~5 중 핵심) */}
            {post ? (
              <ReportButton type="post" targetId={post.id} board={board} />
            ) : null}
          </div>
        </header>

        {loading ? (
          <section className="bg-zinc-900 rounded-xl p-4 text-zinc-300">
            불러오는 중...
          </section>
        ) : error ? (
          <section className="bg-zinc-900 rounded-xl p-4 text-red-300">
            에러: {error}
          </section>
        ) : !post ? (
          <section className="bg-zinc-900 rounded-xl p-6 text-zinc-300 space-y-2">
            <div className="text-lg font-semibold">이 글은 볼 수 없습니다.</div>
            <div className="text-sm text-zinc-400">
              숨김 처리되었거나 삭제된 글일 수 있어요.
            </div>
          </section>
        ) : (
          <>
            {/* 게시글 본문 */}
            <section className="bg-zinc-900 rounded-xl p-5 space-y-3">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold">{post.title ?? '(제목 없음)'}</h1>
                <div className="text-xs text-zinc-400">
                  {formatDate(post)} · 작성자: {post.author ?? '익명'}
                </div>
              </div>

              <div className="whitespace-pre-line text-zinc-200">
                {post.content ?? ''}
              </div>

              <div className="text-xs text-zinc-500">
                신고 누적이 3회 이상이면 자동 숨김 처리됩니다.
              </div>
            </section>

            {/* 댓글 */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">댓글 ({comments.length})</div>
              </div>

              {/* 댓글 작성 */}
              <div className="bg-zinc-900 rounded-xl p-4 space-y-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="익명 댓글을 입력하세요"
                  className="w-full min-h-[90px] rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm outline-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={submitComment}
                    disabled={saving}
                    className="rounded-lg px-4 py-2 bg-red-600 hover:bg-red-700 text-sm disabled:opacity-60"
                  >
                    {saving ? '등록 중...' : '등록'}
                  </button>
                </div>
              </div>

              {/* 댓글 목록 */}
              {comments.length === 0 ? (
                <div className="bg-zinc-900 rounded-xl p-4 text-zinc-400 text-sm">
                  아직 댓글이 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {comments.map((c) => (
                    <div key={c.id} className="bg-zinc-900 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-xs text-zinc-400">
                          {formatDate(c)} · {c.author ?? '익명'}
                        </div>

                        {/* ✅ 댓글 신고 버튼 (compact) */}
                        <ReportButton
                          type="comment"
                          targetId={c.id}
                          board={board}
                          compact
                        />
                      </div>

                      <div className="mt-2 whitespace-pre-line text-zinc-200">
                        {c.content ?? ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}

