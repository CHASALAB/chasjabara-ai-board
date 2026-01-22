'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getAnonId } from '@/lib/anon'

type PostRow = {
  id: string
  board: string
  title: string
  content: string
  created_at: string
  hidden?: boolean | null
}

type CommentRow = {
  id: string
  post_id: string
  content: string
  created_at: string
  hidden?: boolean | null
  author_anon_id?: string | null
}

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}

export default function PostDetailPage() {
  const params = useParams()

  const rawBoardAny = (params as any)?.board
  const rawBoard = useMemo(() => {
    if (Array.isArray(rawBoardAny)) return rawBoardAny[0] ?? ''
    return typeof rawBoardAny === 'string' ? rawBoardAny : ''
  }, [rawBoardAny])

  const board = useMemo(() => safeDecode(rawBoard).trim(), [rawBoard])
  const boardSlug = useMemo(() => encodeURIComponent(board), [board])

  const rawIdAny = (params as any)?.id
  const id = useMemo(() => {
    if (Array.isArray(rawIdAny)) return rawIdAny[0] ?? ''
    return typeof rawIdAny === 'string' ? rawIdAny : ''
  }, [rawIdAny])

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [post, setPost] = useState<PostRow | null>(null)

  const [comments, setComments] = useState<CommentRow[]>([])
  const [cLoading, setCLoading] = useState(false)
  const [cError, setCError] = useState('')

  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [toast, setToast] = useState<string>('')

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(''), 1800)
  }

  async function loadPost(postId: string) {
    const { data, error } = await supabase
      .from('posts')
      .select('id, board, title, content, created_at, hidden')
      .eq('id', postId)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    const row = data as PostRow
    if (row.hidden === true) return null
    return row
  }

  async function loadComments(postId: string) {
    setCLoading(true)
    setCError('')

    const { data, error } = await supabase
      .from('comments')
      .select('id, post_id, content, created_at, hidden, author_anon_id')
      .eq('post_id', postId)
      .eq('hidden', false)
      .order('created_at', { ascending: true })

    if (error) {
      setCError(error.message ?? '댓글을 불러오지 못했습니다.')
      setComments([])
    } else {
      setComments((data ?? []) as CommentRow[])
    }

    setCLoading(false)
  }

  useEffect(() => {
    let mounted = true

    async function run() {
      setLoading(true)
      setErrorMsg('')
      setPost(null)
      setComments([])

      try {
        if (!id) {
          setErrorMsg('게시글 id가 없습니다.')
          return
        }

        const p = await loadPost(id)
        if (!mounted) return

        if (!p) {
          setErrorMsg('게시글을 찾을 수 없거나 숨김 처리되었습니다.')
          return
        }

        setPost(p)
        await loadComments(id)
      } catch (e: any) {
        if (!mounted) return
        setErrorMsg(e?.message ?? '게시글을 불러오지 못했습니다.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    run()
    return () => {
      mounted = false
    }
  }, [id])

  async function submitComment() {
    const content = newComment.trim()
    if (!id) return
    if (!content) {
      setSubmitError('댓글 내용을 입력해주세요.')
      return
    }

    setSubmitting(true)
    setSubmitError('')

    const anonId = getAnonId()

    const { error } = await supabase.from('comments').insert({
      post_id: id,
      content,
      author_anon_id: anonId,
    })

    if (error) {
      setSubmitError(error.message ?? '댓글 등록 실패')
      setSubmitting(false)
      return
    }

    setNewComment('')
    setSubmitting(false)
    await loadComments(id)
    showToast('댓글이 등록되었습니다')
  }

  async function reportComment(commentId: string) {
    if (!id) return
    const reporter = getAnonId()

    const { error } = await supabase.from('comment_reports').insert({
      comment_id: commentId,
      reporter_anon_id: reporter,
      reason: null,
    })

    if (error) {
      // 중복 신고 unique constraint
      if ((error as any)?.code === '23505') {
        showToast('이미 신고한 댓글입니다')
        return
      }
      showToast(error.message ?? '신고 실패')
      return
    }

    showToast('신고 접수 완료')
    await loadComments(id) // 3회 이상이면 hidden 처리되어 자동으로 사라짐
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 px-4 py-2 rounded-full text-sm text-zinc-100 shadow">
            {toast}
          </div>
        )}

        <header className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold">게시글 보기</h1>

            <Link
              href={`/board/${boardSlug}`}
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              ← {board} 게시판
            </Link>
          </div>
        </header>

        {loading ? (
          <section className="bg-zinc-900 rounded-xl p-4 text-zinc-300">불러오는 중...</section>
        ) : errorMsg ? (
          <section className="bg-zinc-900 rounded-xl p-4 text-red-300">에러: {errorMsg}</section>
        ) : !post ? (
          <section className="bg-zinc-900 rounded-xl p-4 text-zinc-300">게시글이 없습니다.</section>
        ) : (
          <>
            <article className="bg-zinc-900 rounded-xl p-5 space-y-3">
              <div className="text-xs text-zinc-400">
                {new Date(post.created_at).toLocaleString()}
              </div>
              <h2 className="text-2xl font-bold">{post.title}</h2>
              <div className="whitespace-pre-line text-zinc-200">{post.content}</div>
              <div className="text-xs text-zinc-500">작성자: 익명</div>
            </article>

            <section className="bg-zinc-900 rounded-xl p-5 space-y-3">
              <div className="font-semibold">댓글 작성</div>

              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="댓글을 입력하세요 (익명)"
                className="w-full min-h-[90px] rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-zinc-600"
              />

              {submitError && <div className="text-sm text-red-300">에러: {submitError}</div>}

              <div className="flex justify-end">
                <button
                  onClick={submitComment}
                  disabled={submitting}
                  className="rounded-lg px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-sm"
                >
                  {submitting ? '등록 중...' : '댓글 등록'}
                </button>
              </div>
            </section>

            <section className="bg-zinc-900 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">댓글</div>
                <div className="text-xs text-zinc-500">{comments.length}개</div>
              </div>

              {cLoading ? (
                <div className="text-sm text-zinc-300">댓글 불러오는 중...</div>
              ) : cError ? (
                <div className="text-sm text-red-300">에러: {cError}</div>
              ) : comments.length === 0 ? (
                <div className="text-sm text-zinc-400">아직 댓글이 없습니다.</div>
              ) : (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-zinc-500">
                          익명 · {new Date(c.created_at).toLocaleString()}
                        </div>
                        <button
                          onClick={() => reportComment(c.id)}
                          className="text-xs px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700"
                          title="신고가 누적되면 자동 숨김 처리됩니다"
                        >
                          신고
                        </button>
                      </div>

                      <div className="mt-2 whitespace-pre-line text-zinc-200">{c.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <div className="flex gap-3">
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">메인</Link>
          <Link href="/trend" className="text-sm text-zinc-400 hover:text-zinc-200">트렌드</Link>
          <Link href="/rules" className="text-sm text-zinc-400 hover:text-zinc-200">운영규칙</Link>
        </div>
      </div>
    </main>
  )
}
