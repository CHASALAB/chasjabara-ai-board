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

function isNicknameLike(w: string) {
  // 너무 일반 단어 제외(대충), 2~12 글자
  if (w.length < 2 || w.length > 12) return false
  if (STOP.has(w.toLowerCase())) return false
  // 숫자만인 토큰 제외
  if (/^\d+$/.test(w)) return false
  return true
}

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
          .order('created_at', { ascending: false })
          .limit(350)

        if (pErr) throw pErr

        const { data: cData, error: cErr } = await supabase
          .from('comments')
          .select('id, post_id, content, created_at')
          .gte('created_at', since)
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
    const nameFreq = new Map<string, number>()

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

        // 키워드 TOP
        wordFreq.set(low, (wordFreq.get(low) ?? 0) + 1)

        // 닉네임 후보(대충) TOP
        if (isNicknameLike(w)) {
          nameFreq.set(w, (nameFreq.get(w) ?? 0) + 1)
        }
      }
    }

    const topWords = [...wordFreq.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 20)
    const topBoards = [...boardFreq.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 10)
    const topNames = [...nameFreq.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 20)

    return { topWords, topBoards, topNames }
  }, [posts, comments])

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">트렌드</h1>
            <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">← 메인</Link>
          </div>
          <p className="text-zinc-400 text-sm">최근 7일 글/댓글 기준 트렌드 요약</p>
        </header>

        {loading ? (
          <section className="bg-zinc-900 rounded-xl p-4 text-zinc-300">불러오는 중...</section>
        ) : err ? (
          <section className="bg-zinc-900 rounded-xl p-4 text-red-300">에러: {err}</section>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <section className="bg-zinc-900 rounded-xl p-4">
              <div className="font-semibold mb-3">인기 키워드 TOP 20</div>
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

            <section className="bg-zinc-900 rounded-xl p-4 md:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">닉네임 언급 TOP 20 (추정)</div>
                <Link href="/analyze" className="text-sm text-zinc-400 hover:text-zinc-200">
                  → 이 사람 어때 분석하러 가기
                </Link>
              </div>

              <div className="flex flex-wrap gap-2">
                {view.topNames.map(([n, c]) => (
                  <Link
                    key={n}
                    href={`/analyze?name=${encodeURIComponent(n)}`}
                    className="px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-sm"
                    title="클릭하면 분석 페이지로"
                  >
                    {n} <span className="text-zinc-400">({c})</span>
                  </Link>
                ))}
              </div>

              <div className="text-xs text-zinc-500 mt-3">
                ※ “닉네임 추정”이라 일반 단어가 섞일 수 있어요. 데이터가 쌓일수록 정확해집니다.
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
