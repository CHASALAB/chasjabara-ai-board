'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import SiteHeader from '@/app/components/SiteHeader'
import { getSupabaseBrowser } from '@/lib/supabase'

type PostRow = {
  id: string
  board: string
  title: string
  content: string
  created_at: string
  is_hidden: boolean
  hidden_reason: string | null
  hidden_at: string | null
}

type CommentRow = {
  id: string
  post_id: string
  content: string
  created_at: string
  is_hidden: boolean
  hidden_reason: string | null
  hidden_at: string | null
}

type CommentWithBoard = CommentRow & { board: string | null }

type Tab = 'posts' | 'comments'
type LoadState = 'idle' | 'loading' | 'done' | 'error'

export default function ModerationPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), [])

  const [tab, setTab] = useState<Tab>('posts')
  const [state, setState] = useState<LoadState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const [hiddenPosts, setHiddenPosts] = useState<PostRow[]>([])
  const [hiddenComments, setHiddenComments] = useState<CommentWithBoard[]>([])

  async function load() {
    setState('loading')
    setErrorMsg('')
    try {
      // 1) 숨김 게시글
      const postsRes = await supabase
        .from('posts')
        .select('id,board,title,content,created_at,is_hidden,hidden_reason,hidden_at')
        .eq('is_hidden', true)
        .order('hidden_at', { ascending: false })
        .limit(200)

      if (postsRes.error) throw postsRes.error
      const posts = (postsRes.data ?? []) as PostRow[]
      setHiddenPosts(posts)

      // 2) 숨김 댓글(댓글 자체에는 board가 없으니, post_id로 posts에서 board를 따로 가져옴)
      const commentsRes = await supabase
        .from('comments')
        .select('id,post_id,content,created_at,is_hidden,hidden_reason,hidden_at')
        .eq('is_hidden', true)
        .order('hidden_at', { ascending: false })
        .limit(300)

      if (commentsRes.error) throw commentsRes.error
      const comments = (commentsRes.data ?? []) as CommentRow[]

      // 댓글이 달린 게시글들의 board를 조회해서 매핑
      const postIds = Array.from(new Set(comments.map((c) => c.post_id).filter(Boolean)))
      let boardMap = new Map<string, string>()

      if (postIds.length > 0) {
        const postBoardsRes = await supabase
          .from('posts')
          .select('id,board')
          .in('id', postIds)

        if (postBoardsRes.error) throw postBoardsRes.error
        const postBoards = (postBoardsRes.data ?? []) as Array<{ id: string; board: string }>
        boardMap = new Map(postBoards.map((p) => [p.id, p.board]))
      }

      const merged: CommentWithBoard[] = comments.map((c) => ({
        ...c,
        board: boardMap.get(c.post_id) ?? null,
      }))

      setHiddenComments(merged)

      setState('done')
    } catch (e: any) {
      setState('error')
      setErrorMsg(e?.message ?? '알 수 없는 오류')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function restorePost(id: string) {
    const ok = confirm('이 게시글을 복구할까요? (숨김 해제)')
    if (!ok) return

    const { error } = await supabase
      .from('posts')
      .update({ is_hidden: false, hidden_reason: null, hidden_at: null })
      .eq('id', id)

    if (error) return alert(`복구 실패: ${error.message}`)
    await load()
    alert('복구 완료!')
  }

  async function restoreComment(id: string) {
    const ok = confirm('이 댓글을 복구할까요? (숨김 해제)')
    if (!ok) return

    const { error } = await supabase
      .from('comments')
      .update({ is_hidden: false, hidden_reason: null, hidden_at: null })
      .eq('id', id)

    if (error) return alert(`복구 실패: ${error.message}`)
    await load()
    alert('복구 완료!')
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <SiteHeader />

        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">관리자 · 숨김 관리</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              className="rounded-lg px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm"
            >
              새로고침
            </button>
            <Link href="/" className="text-sm text-zinc-300 hover:text-white">
              ← 메인
            </Link>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTab('posts')}
            className={`rounded-lg px-4 py-2 text-sm ${
              tab === 'posts' ? 'bg-red-600' : 'bg-zinc-800 hover:bg-zinc-700'
            }`}
          >
            숨김 게시글
          </button>
          <button
            onClick={() => setTab('comments')}
            className={`rounded-lg px-4 py-2 text-sm ${
              tab === 'comments' ? 'bg-red-600' : 'bg-zinc-800 hover:bg-zinc-700'
            }`}
          >
            숨김 댓글
          </button>
        </div>

        {state === 'loading' && (
          <div className="bg-zinc-900 rounded-xl p-4 text-zinc-300">불러오는 중…</div>
        )}

        {state === 'error' && (
          <div className="bg-zinc-900 rounded-xl p-4 text-zinc-300">
            <div className="font-semibold mb-2">오류</div>
            <div className="text-zinc-400 text-sm whitespace-pre-line">{errorMsg}</div>
          </div>
        )}

        {state === 'done' && tab === 'posts' && (
          <section className="bg-zinc-900 rounded-xl p-4 space-y-3">
            {hiddenPosts.length === 0 ? (
              <div className="text-zinc-300">숨김 게시글이 없습니다.</div>
            ) : (
              hiddenPosts.map((p) => (
                <div key={p.id} className="rounded-xl bg-zinc-950/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm text-zinc-400">게시판: {p.board}</div>
                      <div className="text-lg font-semibold">{p.title}</div>
                      <div className="text-xs text-zinc-500">
                        숨김 사유: {p.hidden_reason ?? '(없음)'} · 숨김 시각:{' '}
                        {p.hidden_at ? new Date(p.hidden_at).toLocaleString() : '(없음)'}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/board/${encodeURIComponent(p.board)}/post/${p.id}`}
                        className="rounded-lg px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm text-center"
                      >
                        원문 보기
                      </Link>
                      <button
                        onClick={() => restorePost(p.id)}
                        className="rounded-lg px-3 py-2 bg-red-600 hover:bg-red-700 text-sm"
                      >
                        복구
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 text-zinc-200 whitespace-pre-line">
                    {p.content}
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {state === 'done' && tab === 'comments' && (
          <section className="bg-zinc-900 rounded-xl p-4 space-y-3">
            {hiddenComments.length === 0 ? (
              <div className="text-zinc-300">숨김 댓글이 없습니다.</div>
            ) : (
              hiddenComments.map((c) => {
                const board = c.board ?? '알수없음'
                const canGo = c.board != null
                return (
                  <div key={c.id} className="rounded-xl bg-zinc-950/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm text-zinc-400">게시판: {board}</div>
                        <div className="text-xs text-zinc-400">
                          댓글ID: {c.id}
                          <br />
                          게시글ID: {c.post_id}
                        </div>
                        <div className="text-xs text-zinc-500">
                          숨김 사유: {c.hidden_reason ?? '(없음)'} · 숨김 시각:{' '}
                          {c.hidden_at ? new Date(c.hidden_at).toLocaleString() : '(없음)'}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {canGo ? (
                          <Link
                            href={`/board/${encodeURIComponent(board)}/post/${c.post_id}`}
                            className="rounded-lg px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm text-center"
                          >
                            게시글로 이동
                          </Link>
                        ) : (
                          <div className="rounded-lg px-3 py-2 bg-zinc-800/60 text-sm text-center text-zinc-300">
                            이동불가(게시판 미확인)
                          </div>
                        )}

                        <button
                          onClick={() => restoreComment(c.id)}
                          className="rounded-lg px-3 py-2 bg-red-600 hover:bg-red-700 text-sm"
                        >
                          복구
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 text-zinc-200 whitespace-pre-line">
                      {c.content}
                    </div>
                  </div>
                )
              })
            )}
          </section>
        )}

        <div className="text-xs text-zinc-500">
          ※ 접속 링크: <b>/admin/moderation</b>
        </div>
      </div>
    </main>
  )
}
