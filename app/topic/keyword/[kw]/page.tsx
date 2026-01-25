'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import SiteHeader from '@/app/components/SiteHeader'
import NoticeBanner from '@/app/components/NoticeBanner'

import { getSupabaseBrowser } from '@/lib/supabase'

type PostHit = {
  id: string
  board: string | null
  title: string | null
  content: string | null
  created_at: string | null
}

type CommentHit = {
  id: string
  post_id: string | null
  created_at: string | null
  content: string | null
  post: { board: string | null; title: string | null } | null
}

type LoadState = 'idle' | 'loading' | 'done' | 'error'

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}

export default function TopicKeywordPage() {
  const params = useParams()
  const rawKw = (params?.kw as string) ?? ''
  const kw = useMemo(() => safeDecode(rawKw).trim(), [rawKw])

  const supabase = useMemo(() => getSupabaseBrowser(), [])

  const [state, setState] = useState<LoadState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [postHits, setPostHits] = useState<PostHit[]>([])
  const [commentHits, setCommentHits] = useState<CommentHit[]>([])

  useEffect(() => {
    let mounted = true

    async function load() {
      if (!kw) {
        setState('done')
        setPostHits([])
        setCommentHits([])
        return
      }

      setState('loading')
      setErrorMsg('')
      setPostHits([])
      setCommentHits([])

      try {
        // 1) 게시글: 제목/본문에서 키워드 포함
        const postsRes = await supabase
          .from('posts')
          .select('id,board,title,content,created_at')
          .or(`title.ilike.%${kw}%,content.ilike.%${kw}%`)
          .order('created_at', { ascending: false })
          .limit(50)

        if (postsRes.error) throw postsRes.error

        // 2) 댓글: 본문에서 키워드 포함 + posts join
        // ✅ 핵심: post:posts(...) 로 alias 주면 post가 "객체"로 들어옴(배열 X)
        const commentsRes = await supabase
          .from('comments')
          .select('id,post_id,created_at,content,post:posts(board,title)')
          .ilike('content', `%${kw}%`)
          .order('created_at', { ascending: false })
          .limit(50)

        if (commentsRes.error) throw commentsRes.error

        if (!mounted) return

        setPostHits((postsRes.data ?? []) as PostHit[])
        // ✅ 타입 충돌 방지: unknown 한번 거쳐서 캐스팅
        setCommentHits((commentsRes.data ?? []) as unknown as CommentHit[])
        setState('done')
      } catch (e: any) {
        if (!mounted) return
        setState('error')
        setErrorMsg(e?.message ?? '알 수 없는 오류')
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [kw, supabase])

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <SiteHeader />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">키워드</h1>
          <Link href="/trend" className="text-sm text-zinc-300 hover:text-white">
            ← 트렌드
          </Link>
        </div>

        <NoticeBanner />

        <section className="bg-zinc-900 rounded-xl p-4">
          <div className="text-sm text-zinc-300">
            검색 키워드: <span className="font-semibold text-white">{kw || '(없음)'}</span>
          </div>
        </section>

        {state === 'loading' && (
          <div className="bg-zinc-900 rounded-xl p-4 text-zinc-300">불러오는 중…</div>
        )}

        {state === 'error' && (
          <div className="bg-zinc-900 rounded-xl p-4 text-zinc-300 space-y-2">
            <div className="font-semibold">불러오기 실패</div>
            <div className="text-zinc-400 text-sm whitespace-pre-line">{errorMsg}</div>
          </div>
        )}

        {state === 'done' && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* 게시글 */}
            <section className="bg-zinc-900 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">게시글</h2>
                <span className="text-xs text-zinc-400">{postHits.length}개</span>
              </div>

              {postHits.length === 0 ? (
                <div className="text-zinc-400 text-sm">해당 키워드의 게시글이 없습니다.</div>
              ) : (
                <ul className="space-y-2">
                  {postHits.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-lg bg-zinc-950/40 px-3 py-2 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs text-zinc-400">{p.board ?? '게시판'}</div>
                        <div className="font-medium truncate">{p.title ?? '(제목 없음)'}</div>
                        <div className="text-xs text-zinc-500 line-clamp-2 mt-1">
                          {p.content ?? ''}
                        </div>
                      </div>

                      <Link
                        className="text-xs text-zinc-300 hover:text-white shrink-0"
                        href={`/board/${encodeURIComponent(p.board ?? 'unknown')}/post/${p.id}`}
                      >
                        보기 →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 댓글 */}
            <section className="bg-zinc-900 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">댓글</h2>
                <span className="text-xs text-zinc-400">{commentHits.length}개</span>
              </div>

              {commentHits.length === 0 ? (
                <div className="text-zinc-400 text-sm">해당 키워드의 댓글이 없습니다.</div>
              ) : (
                <ul className="space-y-2">
                  {commentHits.map((c) => {
                    const board = c.post?.board ?? 'unknown'
                    const title = c.post?.title ?? '(제목 없음)'

                    return (
                      <li
                        key={c.id}
                        className="rounded-lg bg-zinc-950/40 px-3 py-2 space-y-1"
                      >
                        <div className="text-xs text-zinc-400">
                          {board} · {title}
                        </div>

                        <div className="text-sm text-zinc-200 line-clamp-3">{c.content ?? ''}</div>

                        {c.post_id ? (
                          <Link
                            className="text-xs text-zinc-300 hover:text-white inline-block mt-1"
                            href={`/board/${encodeURIComponent(board)}/post/${c.post_id}`}
                          >
                            원문 이동 →
                          </Link>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
