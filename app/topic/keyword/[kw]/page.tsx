'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import SiteHeader from '@/app/components/SiteHeader'
import NoticeBanner from '@/app/components/NoticeBanner'

import { getSupabaseBrowser } from '@/lib/supabase'
import { shouldHideEvidence, MIN_EVIDENCE_SAMPLE, bucketCount } from '@/lib/anonymity'

type PostHit = {
  id: string
  board: string
  title: string
  created_at: string
}

type CommentHit = {
  id: string
  post_id: string
  created_at: string
  content: string
  post?: {
    board: string | null
    title: string | null
  } | null
}

type LoadState = 'idle' | 'loading' | 'done' | 'error'

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}

export default function KeywordPage() {
  const params = useParams()
  const kw = useMemo(() => safeDecode((params?.kw ?? '') as string), [params])

  const supabase = useMemo(() => getSupabaseBrowser(), [])

  const [state, setState] = useState<LoadState>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')

  const [postHits, setPostHits] = useState<PostHit[]>([])
  const [commentHits, setCommentHits] = useState<CommentHit[]>([])

  useEffect(() => {
    let mounted = true

    async function load() {
      setState('loading')
      setErrorMsg('')
      setPostHits([])
      setCommentHits([])

      try {
        // 1) 게시글: 제목/본문에 키워드 포함 (숨김 제외)
        const { data: posts, error: pErr } = await supabase
          .from('posts')
          .select('id,board,title,created_at')
          .eq('is_hidden', false)
          .or(`title.ilike.%${kw}%,content.ilike.%${kw}%`)
          .order('created_at', { ascending: false })
          .limit(20)

        if (pErr) throw pErr

        // 2) 댓글: 댓글 본문에 키워드 포함 + posts 조인해서 board/title 가져오기 (숨김 제외)
        //    ⚠️ FK가 comments.post_id -> posts.id로 잡혀있어야 관계가 자동 인식됨
        const { data: comments, error: cErr } = await supabase
          .from('comments')
          .select('id,post_id,created_at,content, post:posts(board,title)')
          .eq('is_hidden', false)
          .ilike('content', `%${kw}%`)
          .order('created_at', { ascending: false })
          .limit(30)

        if (cErr) throw cErr

        if (!mounted) return
        setPostHits((posts ?? []) as PostHit[])
        setCommentHits((comments ?? []) as CommentHit[])
        setState('done')
      } catch (e: any) {
        if (!mounted) return
        setState('error')
        setErrorMsg(e?.message ?? '알 수 없는 오류')
      }
    }

    if (kw.trim().length > 0) load()
    else {
      setState('error')
      setErrorMsg('키워드가 비어있습니다.')
    }

    return () => {
      mounted = false
    }
  }, [supabase, kw])

  const total = postHits.length + commentHits.length
  const hide = shouldHideEvidence(total, MIN_EVIDENCE_SAMPLE)
  const shown = hide ? bucketCount(total, MIN_EVIDENCE_SAMPLE) : `${total}`

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <SiteHeader />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">키워드: {kw}</h1>
          <div className="flex items-center gap-3">
            <Link href="/trend" className="text-sm text-zinc-300 hover:text-white">
              ← 트렌드
            </Link>
            <Link href="/" className="text-sm text-zinc-300 hover:text-white">
              메인
            </Link>
          </div>
        </div>

        <NoticeBanner />

        <section className="bg-zinc-900 rounded-xl p-4 space-y-2">
          <div className="text-zinc-200">
            관련 항목: <b>{shown}</b>건
          </div>
          {hide && (
            <div className="text-xs text-zinc-500">
              표본 {MIN_EVIDENCE_SAMPLE} 미만이면 “근거(게시글/댓글 목록)”를 숨깁니다.
            </div>
          )}
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
          <>
            {/* ✅ 완전 익명 강화: 표본 부족이면 근거 목록 자체 숨김 */}
            {hide ? (
              <section className="bg-zinc-900 rounded-xl p-4 text-zinc-300">
                표본이 부족해서 근거(게시글/댓글 목록)는 숨김 처리되었습니다.
              </section>
            ) : (
              <>
                <section className="bg-zinc-900 rounded-xl p-4 space-y-3">
                  <div className="font-bold">관련 게시글</div>
                  {postHits.length === 0 ? (
                    <div className="text-zinc-300">관련 게시글이 없습니다.</div>
                  ) : (
                    <ul className="space-y-2">
                      {postHits.map((p) => (
                        <li
                          key={p.id}
                          className="rounded-lg bg-zinc-950/40 px-3 py-2 flex items-center justify-between"
                        >
                          <div className="min-w-0">
                            <div className="text-xs text-zinc-400">{p.board}</div>
                            <Link
                              className="font-medium hover:underline block truncate"
                              href={`/board/${encodeURIComponent(p.board)}/post/${p.id}`}
                            >
                              {p.title}
                            </Link>
                          </div>
                          <div className="text-xs text-zinc-500 ml-3">
                            {new Date(p.created_at).toLocaleString()}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="bg-zinc-900 rounded-xl p-4 space-y-3">
                  <div className="font-bold">관련 댓글</div>
                  {commentHits.length === 0 ? (
                    <div className="text-zinc-300">관련 댓글이 없습니다.</div>
                  ) : (
                    <ul className="space-y-2">
                      {commentHits.map((c) => {
                        const board = c.post?.board ?? ''
                        const title = c.post?.title ?? ''
                        const canLink = !!board

                        return (
                          <li key={c.id} className="rounded-lg bg-zinc-950/40 px-3 py-2 space-y-2">
                            <div className="text-xs text-zinc-500 flex items-center justify-between">
                              <span>{new Date(c.created_at).toLocaleString()}</span>

                              {canLink ? (
                                <Link
                                  className="text-zinc-300 hover:text-white"
                                  href={`/board/${encodeURIComponent(board)}/post/${c.post_id}`}
                                >
                                  게시글로 →
                                </Link>
                              ) : (
                                <span className="text-zinc-500">게시글 링크 없음</span>
                              )}
                            </div>

                            {canLink && (
                              <div className="text-xs text-zinc-400">
                                {board} · {title}
                              </div>
                            )}

                            <div className="text-zinc-200 whitespace-pre-line">{c.content}</div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}
