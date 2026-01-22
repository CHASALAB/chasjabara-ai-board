'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type PostRow = {
  id: string
  board: string | null
  title: string | null
  content: string | null
  created_at: string | null
  hidden?: boolean | null
}

type CommentRow = {
  id: string
  post_id: string
  content: string | null
  created_at: string | null
  hidden?: boolean | null
}

const TOPIC_MAP: Record<string, { title: string; keywords: string[] }> = {
  jing: { title: '징벌', keywords: ['징', '징벌',  '징연습', ] },
  run: { title: '주행', keywords: ['주행',] },
  sup: { title: '서폿', keywords: ['서폿'] },
  meta: { title: '메타', keywords: ['메타','밸런스'] },
  ops: { title: '운영', keywords: ['운영', '규칙', '공지', '제재', '신고', '차단'] },
  mind: { title: '멘탈', keywords: ['멘탈', '매너', '비매너', '욕', '채팅', '싸움', '분쟁'] },
  free: { title: '자유', keywords: [] },
}

const STOP = new Set([
  '그리고','그런데','하지만','그래서','입니다','있습니다','합니다','저','나','너','그','이','저기',
  'the','a','an','and','or','to','of','in','on','for','with',
])

function safeDecode(v: string) {
  try { return decodeURIComponent(v) } catch { return v }
}

function tokenize(text: string) {
  return (text ?? '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
}

function cut(s: string, n = 120) {
  const t = (s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}

export default function TopicPage() {
  const params = useParams()
  const rawSlug = (params?.slug ?? '') as string
  const slug = useMemo(() => safeDecode(rawSlug).trim(), [rawSlug])

  const topic = TOPIC_MAP[slug] ?? { title: slug || '주제', keywords: [] }

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [comments, setComments] = useState<CommentRow[]>([])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setErr(null)
      try {
        const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

        const { data: pData, error: pErr } = await supabase
          .from('posts')
          .select('id, board, title, content, created_at, hidden')
          .gte('created_at', since)
          .eq('hidden', false)
          .order('created_at', { ascending: false })
          .limit(800)

        if (pErr) throw pErr

        const { data: cData, error: cErr } = await supabase
          .from('comments')
          .select('id, post_id, content, created_at, hidden')
          .gte('created_at', since)
          .eq('hidden', false)
          .order('created_at', { ascending: false })
          .limit(900)

        if (cErr) throw cErr

        const allPosts = (pData ?? []) as PostRow[]
        const allComments = (cData ?? []) as CommentRow[]

        // ✅ 주제 필터
        if (slug === 'free' || topic.keywords.length === 0) {
          setPosts(allPosts)
          setComments(allComments)
          return
        }

        const keys = topic.keywords.map((k) => k.toLowerCase())
        const hasKey = (t: string) => keys.some((k) => t.includes(k))

        const fp = allPosts.filter((p) => {
          const t = `${p.title ?? ''} ${p.content ?? ''}`.toLowerCase()
          return hasKey(t)
        })

        const fc = allComments.filter((c) => {
          const t = `${c.content ?? ''}`.toLowerCase()
          return hasKey(t)
        })

        setPosts(fp)
        setComments(fc)
      } catch (e: any) {
        setErr(e?.message ?? '주제 페이지 불러오기 실패')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [slug]) // slug 변경 시 재실행

  const view = useMemo(() => {
    const evidence = posts
      .slice()
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        board: p.board ?? '기타',
        title: p.title ?? '(제목 없음)',
        snippet: cut(`${p.title ?? ''} ${p.content ?? ''}`, 130),
        created_at: p.created_at ?? '',
      }))

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

    const topWords = [...wordFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
    const topBoards = [...boardFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)

    return { evidence, topWords, topBoards, sampleSize: posts.length + comments.length }
  }, [posts, comments])

  // ✅ 익명 보호 기준(표본 적으면 근거 숨김)
  const MIN_SAMPLE_FOR_EVIDENCE = 5
  const canShowEvidence = view.sampleSize >= MIN_SAMPLE_FOR_EVIDENCE

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
            <section className="bg-zinc-900 rounded-xl p-4">
              <div className="text-sm text-zinc-400">표본(최근 60일)</div>
              <div className="text-2xl font-bold mt-1">{view.sampleSize}개</div>
              {!canShowEvidence && (
                <div className="mt-3 text-sm text-yellow-300">
                  데이터가 적어 익명 보호를 위해 <b>근거 링크/세부 키워드</b>는 숨깁니다.
                </div>
              )}
            </section>

            <section className="grid md:grid-cols-2 gap-4">
              <div className="bg-zinc-900 rounded-xl p-4">
                <div className="font-semibold mb-3">게시판 분포</div>
                <div className="space-y-2">
                  {view.topBoards.map(([b, c]) => (
                    <div key={b} className="flex items-center justify-between">
                      <span className="text-zinc-200">{b}</span>
                      <span className="text-zinc-400 text-sm">{c}건</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-900 rounded-xl p-4">
                <div className="font-semibold mb-3">핵심 키워드</div>
                {canShowEvidence ? (
                  <div className="flex flex-wrap gap-2">
                    {view.topWords.map(([w, c]) => (
                      <span key={w} className="px-3 py-1 rounded-full bg-zinc-800 text-sm">
                        {w} <span className="text-zinc-400">({c})</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-zinc-400">
                    (표본 부족으로 숨김)
                  </div>
                )}
              </div>
            </section>

            <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">근거(최근 글 링크)</div>
                <div className="text-xs text-zinc-500">최대 10개</div>
              </div>

              {!canShowEvidence ? (
                <div className="text-sm text-zinc-400">
                  표본이 {MIN_SAMPLE_FOR_EVIDENCE}개 이상 쌓이면 익명성을 해치지 않는 범위에서 공개됩니다.
                </div>
              ) : view.evidence.length === 0 ? (
                <div className="text-sm text-zinc-400">아직 근거가 부족해요.</div>
              ) : (
                <div className="space-y-2">
                  {view.evidence.map((e) => {
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
              ※ 익명 보호 정책: 표본이 적을 때는 근거(링크/키워드)를 숨깁니다. 더 쌓이면 자동으로 풀립니다.
            </section>
          </>
        )}
      </div>
    </main>
  )
}
