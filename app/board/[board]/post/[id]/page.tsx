'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase'

type PostRow = {
  id: string
  board: string | null
  title: string | null
  content: string | null
  created_at: string | null
  is_hidden?: boolean | null
}

type CommentRow = {
  id: string
  post_id: string
  content: string | null
  created_at: string | null
  is_hidden?: boolean | null
  author_anon_id?: string | null
}

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()

  const board = decodeURIComponent(String(params.board ?? ''))
  const id = String(params.id ?? '')

  const supabase = useMemo(() => getSupabaseBrowser(), [])

  const [loading, setLoading] = useState(true)
  const [post, setPost] = useState<PostRow | null>(null)
  const [comments, setComments] = useState<CommentRow[]>([])
  const [err, setErr] = useState('')

  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ✅ 안전한 select: 존재할 수도/없을 수도 있는 컬럼은 빼고 “기본 컬럼만”
  // (스키마가 달라도 500이 안 나게)
  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setErr('')
      setPost(null)
      setComments([])

      try {
        // 1) 게시글 로드 (기본 컬럼만)
        const { data: postData, error: postErr } = await supabase
          .from('posts')
          .select('id, board, title, content, created_at')
          .eq('id', id)
          .maybeSingle()

        if (postErr) throw postErr
        if (!mounted) return

        if (!postData) {
          setErr('게시글을 찾을 수 없어요. (삭제되었거나 숨김 처리되었을 수 있어요)')
          setLoading(false)
          return
        }

        setPost(postData as PostRow)

        // 2) 댓글 로드 (기본 컬럼만)
        const { data: cData, error: cErr } = await supabase
          .from('comments')
          .select('id, post_id, content, created_at')
          .eq('post_id', id)
          .order('created_at', { ascending: true })

        // comments 테이블이 아직 없거나 권한 문제면, 댓글 없이라도 페이지는 뜨게
        if (!cErr) setComments((cData ?? []) as CommentRow[])
        setLoading(false)
      } catch (e: any) {
        if (!mounted) return
        setErr(e?.message ?? '알 수 없는 오류가 발생했어요')
        setLoading(false)
      }
    }

    if (!id) {
      setErr('잘못된 접근이에요.')
      setLoading(false)
      return
    }

    load()
    return () => {
      mounted = false
    }
  }, [supabase, id])

  async function onSubmitComment() {
    const content = commentText.trim()
    if (!content) return

    setSubmitting(true)
    setErr('')

    try {
      // ✅ author_anon_id가 NOT NULL이면, 로컬에 없을 때 생성해서 넣기
      const key = 'chasjabara_anon_id'
      let anon = localStorage.getItem(key)
      if (!anon) {
        anon = crypto.randomUUID()
        localStorage.setItem(key, anon)
      }

      const { error } = await supabase.from('comments').insert({
        post_id: id,
        content,
        author_anon_id: anon,
      })

      if (error) throw error

      setCommentText('')

      // 다시 로드(간단)
      const { data: cData } = await supabase
        .from('comments')
        .select('id, post_id, content, created_at')
        .eq('post_id', id)
        .order('created_at', { ascending: true })

      setComments((cData ?? []) as CommentRow[])
    } catch (e: any) {
      setErr(e?.message ?? '댓글 등록에 실패했어요')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href={`/board/${encodeURIComponent(board)}`} className="text-sm text-zinc-300 hover:text-white">
            ← {board} 게시판
          </Link>
          <button
            onClick={() => router.refresh()}
            className="text-xs px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
          >
            새로고침
          </button>
        </div>

        {loading && (
          <div className="bg-zinc-900 rounded-xl p-4 text-zinc-300">
            불러오는 중…
          </div>
        )}

        {!loading && err && (
          <div className="bg-zinc-900 rounded-xl p-4 text-zinc-300 space-y-2">
            <div className="font-semibold">오류</div>
            <div className="text-zinc-400 text-sm whitespace-pre-line">{err}</div>
          </div>
        )}

        {!loading && !err && post && (
          <>
            <article className="bg-zinc-900 rounded-xl p-5 space-y-3">
              <h1 className="text-xl font-bold">{post.title ?? '(제목 없음)'}</h1>
              <div className="text-xs text-zinc-500">
                {post.created_at ? new Date(post.created_at).toLocaleString() : ''}
              </div>
              <div className="whitespace-pre-line text-zinc-200">
                {post.content ?? ''}
              </div>
            </article>

            <section className="bg-zinc-900 rounded-xl p-5 space-y-3">
              <div className="font-semibold">댓글</div>

              <div className="flex flex-col gap-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  placeholder="댓글을 입력하세요 (익명)"
                  className="w-full rounded-lg bg-zinc-950/40 border border-zinc-800 px-3 py-2 text-sm outline-none"
                />
                <button
                  onClick={onSubmitComment}
                  disabled={submitting}
                  className="rounded-lg px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-sm"
                >
                  {submitting ? '등록 중…' : '댓글 등록'}
                </button>
              </div>

              {comments.length === 0 ? (
                <div className="text-zinc-400 text-sm">아직 댓글이 없습니다.</div>
              ) : (
                <ul className="space-y-2">
                  {comments.map((c) => (
                    <li key={c.id} className="rounded-lg bg-zinc-950/40 px-3 py-2">
                      <div className="text-xs text-zinc-500">
                        {c.created_at ? new Date(c.created_at).toLocaleString() : ''}
                      </div>
                      <div className="mt-1 whitespace-pre-line text-zinc-200">
                        {c.content ?? ''}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}
