'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type PostRow = {
  id: string
  board: string | null
  title: string | null
  content: string | null
  created_at?: string | null
}

type CommentRow = {
  id: string
  post_id: string
  content: string | null
  created_at?: string | null
}

const TOPIC_MAP: Record<string, { title: string; keywords: string[] }> = {
  jing: { title: '징벌', keywords: ['징','징벌','징연습''] },
  run: { title: '주행', keywords: ['주행'] },
  sup: { title: '서폿', keywords: ['서폿] },
  meta: { title: '메타', keywords: ['메타','티어','밸런스'] },
  ops: { title: '운영', keywords: ['운영','판단','각','콜','시야','포지션','동선'] },
  mind: { title: '멘탈', keywords: ['멘탈','매너','비매너','욕','채팅','싸움','분쟁'] },
  free: { title: '자유', keywords: [] },
}

function safeDecode(v: string) {
  try { return decodeURIComponent(v) } catch { return v }
}

function cut(s: string, n = 110) {
  const t = (s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}

function tokenize(text: string) {
  return (text ?? '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
}

// 간단 키워드 TOP용 불용어
const STOP = new Set([
  '그리고','그런데','하지만','그래서','입니다','있습니다','합니다','저','나','너','그','이','저기',
  'the','a','an','and','or','to','of','in','on','for','with'
])

export default function TopicPage() {
  const params = useParams()
  const raw = (params?.slug ?? '') as string
  const slug = useMemo(() => safeDecode(raw).trim(), [raw])

  const topic = TOPIC_MAP[slug] ?? { title: slug || '주제', keywords: [] }

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [comments, setComments] = useState<CommentRow[]>([])

  const stats = useMemo(() => {
    // 최근 글/댓글에서 키워드 TOP, 게시판 분포, 근거 링크용
    const wordFreq = new Map<string, number>()
    const boardFreq = new Map<string, number>()

    const allText: string[] = []
    for (const p of posts) {
      const b = (p.board ?? '기타').toString()
      boardFreq.set(b, (boardFreq.get(b) ?? 0) + 1)
      allText.push(`${p.title ?? ''} ${p.content ?? ''}`)
    }
    for (const c of comments) allText.push(c.content ?? '')

    for (const t of allText) {
      for (const w of tokenize(t)) {
        const low = w.toLowerCase()
        if (STOP.has(low)) continue
        if (w.length < 2) continue
        wordFreq.set(low, (wordFreq.get(low) ?? 0) + 1)
      }
    }

    const topWords = [...wordFreq.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 20)
    const topBoards = [...boardFreq.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 8)

    // 근거 링크(최근 게시글 8개)
    const evidence = posts
      .slice()
      .sort((a,b)=> (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        board: p.board ?? '기타',
        title: p.title ?? '(제목 없음)',
        snippet: cut(`${p.title ?? ''} ${p.content ?? ''}`, 130),
        created_at: p.created_at ?? '',
      }))

    return { topWords, topBoards, evidence }
  }, [posts, comments])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setErr(null)
      try {
        const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

        // 최근 글 가져오기
        const { data: pData, error: pErr } = await supabase
          .from('posts')
          .select('id, board, title, content, created_at')
          .gte('created_at', since)
          .eq('hidden', false)
          .order('created_at', { ascending: false })
          .limit(700)

        if (pErr) throw pErr

        // 최근 댓글도 가져오기(주제 키워드 TOP에 활용)
        const { data: cData, error: cErr } = await supabase
          .from('comments')
          .select('id, post_id, content, created_at')
          .gte('created_at', since)
          .eq('hidden', false)
          .order('created_at', { ascending: false })
          .limit(900)

        if (cErr) throw cErr

        const allPosts = (pData ?? []) as PostRow[]
        const allComments = (cData ?? []) as CommentRow[]

        // ✅ 주제 필터
        // free(자유)는 필터 없이 보여주고, 나머지는 키워드 포함된 글/댓글만
        if (slug === 'free' || topic.keywords.length === 0) {
          setPosts(allPosts)
          setComments(allComments)
        } else {
          const keys = topic.keywords.map((k) => k.toLowerCase())
          const hasKey = (t: string) => keys.some((k) => t.includes(k))

          setPosts(
            allPosts.filter((p) => {
              const t = `${p.title ?? ''} ${p.content ?? ''}`.toLowerCase()
              return hasKey(t)
            })
          )

          setComments(
            allComments.filter((c) => {
              const t = `${c.content ?? ''}`.toLowerCase()
              return hasKey(t)
            })
          )
        }
      } catch (e: any) {
        setErr(e?.message ?? '주제 페이지 불러오기 실패')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [slug]) // slug 바뀌면 다시 로드

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">주제: {topic.title}</h1>
            <div className="flex gap-3">
              <Link href="/trend" className="text-sm text-zinc-400 hover:text-zinc-200">트렌드</Link>
              <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">메인</Link>
            </div>
          </div>
          <p className="text-zinc-400 text-sm">
            개인(닉네임) 단위가 아닌 <b>주제 단위</b>로만 모아 보여줍니다. (완전 익명 지향)
          </p>
        </header>

        {loading ? (
          <section className="bg-zinc-900 rounded-xl p-4 text-zinc-300">불러오는 중...</section>
        ) : err ? (
          <section className="bg-zinc-900 rounded-xl p-4 text-red-300">에러: {err}</section>
        ) : (
          <>
            <section className="grid md:grid-cols-2 gap-4">
              <div className="bg-zinc-900 rounded-xl p-4">
                <div className="font-semibold mb-3">핵심 키워드 TOP</div>
                <div className="flex flex-wrap gap-2">
                  {stats.topWords.map(([w, c]) => (
                    <span key={w} className="px-3 py-1 rounded-full bg-zinc-800 text-sm">
                      {w} <span className="text-zinc-400">({c})</span>
                    </span>
                  ))}
                </div>
                <div className="text-xs text-zinc-500 mt-3">
                  (최근 60일 기준)
                </div>
              </div>

              <div className="bg-zinc-900 rounded-xl p-4">
                <div className="font-semibold mb-3">언급 게시판 분포</div>
                <div className="space-y-2">
                  {stats.topBoards.map(([b, c]) => (
                    <div key={b} className="flex items-center justify-between">
                      <span className="text-zinc-200">{b}</span>
                      <span className="text-zinc-400 text-sm">{c}건</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">근거(최근 글 링크)</div>
                <div className="text-xs text-zinc-500">최대 10개</div>
              </div>

              {stats.evidence.length === 0 ? (
                <div className="text-sm text-zinc-400">아직 근거가 부족해요.</div>
              ) : (
                <div className="space-y-2">
                  {stats.evidence.map((e) => {
                    const boardSlug = encodeURIComponent(e.board ?? '기타')
                    return (
                      <Link
                        key={e.id}
                        href={`/board/${boardSlug}/post/${e.id}`}
                        className="block bg-zinc-950 border border-zinc-800 rounded-xl p-3 hover:bg-zinc-900"
                      >
                        <div className="text-xs text-zinc-500">
                          {e.board} · {e.created_at ? new Date(e.created_at).toLocaleString() : ''}
                        </div>
                        <div className="mt-1 font-semibold text-sm">{e.title}</div>
                        <div className="mt-1 text-sm text-zinc-300">{e.snippet}</div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="bg-zinc-900 rounded-xl p-4 text-xs text-zinc-500">
              ※ 다음 고급화: 주제별 “주간 변화량”, “핫 키워드 급상승”, “주제 추천(비슷한 주제)” 가능
            </section>
          </>
        )}
      </div>
    </main>
  )
}
