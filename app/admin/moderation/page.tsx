'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import SiteHeader from '@/app/components/SiteHeader'
import NoticeBanner from '@/app/components/NoticeBanner'

import { getSupabaseBrowser } from '@/lib/supabase'

type HiddenPost = {
  id: string
  board: string
  title: string
  content: string
  created_at: string
  is_hidden: boolean
  hidden_reason: string | null
  hidden_at: string | null
}

type HiddenComment = {
  id: string
  post_id: string
  content: string
  created_at: string
  is_hidden: boolean
  hidden_reason: string | null
  hidden_at: string | null
}

type LoadState = 'idle' | 'loading' | 'done' | 'error'

export default function AdminModerationPage() {
  // ✅ 이제 getSupabaseBrowser()는 절대 null을 리턴하지 않음(없으면 throw)
  const supabase = useMemo(() => getSupabaseBrowser(), [])

  const [state, setState] = useState<LoadState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const [hiddenPosts, setHiddenPosts] = useState<HiddenPost[]>([])
  const [hiddenComments, setHiddenComments] = useState<HiddenComment[]>([])

  useEffect(() => {
    let mounted = true

    async function load() {
      setState('loading')
      setErrorMsg('')
      setHiddenPosts([])
      setHiddenComments([])

      try {
        const postsRes = await supabase
          .from('posts')
          .select('id,board,title,content,created_at,is_hidden,hidden_reason,hidden_at')
          .eq('is_hidden', true)
          .order('hidden_at', { ascending: false })
          .limit(200)

        if (postsRes.error) throw postsRes.error

        const commentsRes = await supabase
          .from('comments')
          .select('id,post_id,content,created_at,is_hidden,hidden_reason,hidden_at')
          .eq('is_hidden', true)
          .order('hidden_at', { ascending: false })
          .limit(200)

        if (commentsRes.error) throw commentsRes.error

        if (!mounted) return
        setHiddenPosts((postsRes.data ?? []) as HiddenPost[])
        setHiddenComments((commentsRes.data ?? []) as HiddenComment[])
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
  }, [supabase])

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <SiteHeader />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">운영자 · 숨김 관리</h1>
          <Link href="/" className="text-sm text-zinc-300 hover:text-white">
            ← 메인
          </Link>
        </div>

        <NoticeBanner />

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
          <div className="space-y-6">
            <section className="bg-zinc-900 rounded-xl p-4 space-y-3">
              <h2 className="text-lg font-semibold">숨김 게시글</h2>
              {hiddenPosts.length === 0 ? (
                <div className="text-zinc-300">숨김 게시글이 없습니다.</div>
              ) : (
                <ul className="space-y-2">
                  {hiddenPosts.map((p) => (
                    <li key={p.id} className="rounded-lg bg-zinc-950/40 px-3 py-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          [{p.board}] {p.title}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {new Date(p.hidden_at ?? p.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm text-zinc-300 whitespace-pre-line">{p.content}</div>
                      <div className="text-xs text-zinc-500">사유: {p.hidden_reason ?? '(없음)'}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-zinc-900 rounded-xl p-4 space-y-3">
              <h2 className="text-lg font-semibold">숨김 댓글</h2>
              {hiddenComments.length === 0 ? (
                <div className="text-zinc-300">숨김 댓글이 없습니다.</div>
              ) : (
                <ul className="space-y-2">
                  {hiddenComments.map((c) => (
                    <li key={c.id} className="rounded-lg bg-zinc-950/40 px-3 py-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-zinc-200">post_id: {c.post_id}</div>
                        <div className="text-xs text-zinc-500">
                          {new Date(c.hidden_at ?? c.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm text-zinc-300 whitespace-pre-line">{c.content}</div>
                      <div className="text-xs text-zinc-500">사유: {c.hidden_reason ?? '(없음)'}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
