'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type PostRow = { id: string; board: string | null; title: string | null; content: string | null; created_at?: string | null }
type CommentRow = { id: string; post_id: string; content: string | null; created_at?: string | null }

const STOP = new Set([
  '그리고','그런데','하지만','그래서','입니다','있습니다','합니다','저','나','너','그','이','저기',
  'the','a','an','and','or','to','of','in','on','for','with'
])

function tokenize(text: string) {
  return (text ?? '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
}

// ✅ 주제 사전(익명 유지용)
const TOPICS: { slug: string; title: string; keys: string[] }[] = [
  { slug: 'jing', title: '징벌', keys: ['징','징벌','징작','징연습','징러','징벌러'] },
  { slug: 'run', title: '주행', keys: ['주행','라인','드리프트','코너','부스터','속도','주자'] },
  { slug: 'sup', title: '서폿', keys: ['서폿','서포','보조','힐','지원','버프'] },
  { slug: 'meta', title: '메타', keys: ['메타','티어','패치','상향','하향','사기','밸런스'] },
  { slug: 'ops', title: '운영', keys: ['운영','판단','각','콜','시야','포지션','동선'] },
  { slug: 'mind', title: '멘탈', keys: ['멘탈','매너','비매너','욕','채팅','싸움','분쟁'] },
  { slug: 'free', title: '자유', keys: [] },
]

export default function TrendPage() {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [comments, setComments] = useState<CommentRow[]>([])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setErr(null)
      try {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

        const { data: pData, error: pErr } = await supabase
          .from('posts')
          .select('id, board, title, content, created_at')
          .gte('created_at', since)
          .eq('hidden', false)
          .order('created_at', { ascending: false })
          .limit(350)

        if (pErr) throw pErr

        const { data: cData, error: cErr } = await supabase
          .from('comments')
          .select('id, post_id, content, created_at')
          .gte('created_at', since)
          .eq('hidden', false)
          .order('created_at', { ascending: false })
          .limit(500)

        if (cErr) throw cErr

        setPosts((pData ?? []) as PostRow[])
        setComments((cData ?? []) as CommentRow[])
      } catch (e: any) {
        setErr(e?.message ?? '트렌드 불러오기 실패')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const view = useMemo(() => {
    const wordFreq = new Map<string, number>()
    const boardFreq = new Map<string, number>()
    const topicFreq = new Map<string, number>() // slug -> count
    for (const t of TOPICS) topicFreq.set(t.slug, 0)

    const allText: string[] = []

    for (const p of posts) {
      const b = (p.board ?? '기타').toString()
      boardFreq.set(b, (boardFreq.get(b) ?? 0) + 1)
      allText.push(`${p.title ?? ''} ${p.content ?? ''}`)
    }
    for (const c of comments) allText.push(c.content ?? '')

    for (const t of allText) {
      const lowAll = (t ?? '').toLowerCase()

      // 주제 카운트
      for (const tp of TOPICS) {
        if (tp.slug === 'free') continue
        const hit = tp.keys.some((k) => lowAll.includes(k.toLowerCase()))
        if (hit) topicFreq.set(tp.slug, (topicFreq.get(tp.slug) ?? 0) + 1)
      }

      // 키워드 TOP
      for (const w of tokenize(t)) {
        const low = w.toLowerCase()
        if (STOP.has(low)) continue
        if (w.length < 2) continue
        wordFreq.set(low, (wordFreq.get(low) ?? 0) + 1)
      }
    }

    const topWords = [...wordFreq.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 20)
    const topBoards = [...boardFreq.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 10)

    const topTopics = TOPICS
      .filter((t) => t.slug !== 'free')
      .map((t) => ({ ...t, count: topicFreq.get(t.slug) ?? 0 }))
      .sort((a,b)=> b.count - a.count)
      .slice(0, 6)

    return { topWords, topBoards, topTopics }
  }, [posts, comments])

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">트렌드</h1>
            <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">← 메인</Link>
          </div>
          <p className="text-zinc-400 text-sm">
            최근 7일 기준 · 개인(닉네임) 랭킹 없이 “주제” 중심으로만 보여줍니다.
          </p>
        </header>

        {loading ? (
          <section className="bg-zinc-900 rounded-xl p-4 text-zinc-300">불러오는 중...</section>
        ) : err ? (
          <section className="bg-zinc-900 rounded-xl p-4 text-red-300">에러: {err}</section>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <section className="bg-zinc-900 rounded-xl p-4 md:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">핫한 주제 TOP</div>
                <div className="text-xs text-zinc-500">클릭하면 주제 프로필로 이동</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {view.topTopics.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/topic/${t.slug}`}
                    className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
                  >
                    {t.title} <span className="text-zinc-400">({t.count})</span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="bg-zinc-900 rounded-xl p-4">
              <div className="font-semibold mb-3">인기 키워드 TOP</div>
              <div className="flex flex-wrap gap-2">
                {view.topWords.map(([w, c]) => (
                  <span key={w} className="px-3 py-1 rounded-full bg-zinc-800 text-sm">
                    {w} <span className="text-zinc-400">({c})</span>
                  </span>
                ))}
              </div>
            </section>

            <section className="bg-zinc-900 rounded-xl p-4">
              <div className="font-semibold mb-3">게시판 분포(최근 7일)</div>
              <div className="space-y-2">
                {view.topBoards.map(([b, c]) => (
                  <div key={b} className="flex items-center justify-between">
                    <span className="text-zinc-200">{b}</span>
                    <span className="text-zinc-400 text-sm">{c}건</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-zinc-900 rounded-xl p-4 md:col-span-2 text-xs text-zinc-500">
              ※ 익명성 보호: 트렌드에서 닉네임을 수집/랭킹/링크하지 않습니다.
            </section>
          </div>
        )}
      </div>
    </main>
  )
}

