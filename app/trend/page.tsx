'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type TrendPost = {
  id: string
  board: string | null
  title: string | null
  content: string | null
  created_at?: string | null
  createdAt?: string | null
}

function tokenizeKorean(text: string) {
  // 한글/영문/숫자만 남기고 공백으로 분리
  return text
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
}

const STOPWORDS = new Set([
  '그리고','그런데','하지만','그래서','또는','그리고요','입니다','있습니다','합니다',
  'the','a','an','and','or','to','of','in','on','for','with',
])

export default function TrendPage() {
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<TrendPost[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError(null)

        // 최근 7일 글만 (created_at 기준). 컬럼이 createdAt이면 아래에서 fallback 처리.
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

        const { data, error } = await supabase
          .from('posts')
          .select('id, board, title, content, created_at')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(300)

        if (error) throw error
        setPosts((data ?? []) as TrendPost[])
      } catch (e: any) {
        setError(e?.message ?? '트렌드 데이터를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [])

  const { topWords, byBoard } = useMemo(() => {
    const freq = new Map<string, number>()
    const boardCnt = new Map<string, number>()

    for (const p of posts) {
      const board = (p.board ?? '기타').toString()
      boardCnt.set(board, (boardCnt.get(board) ?? 0) + 1)

      const text = `${p.title ?? ''} ${p.content ?? ''}`.trim()
      if (!text) continue

      for (const w of tokenizeKorean(text)) {
        const word = w.toLowerCase()
        if (word.length < 2) continue
        if (STOPWORDS.has(word)) continue
        freq.set(word, (freq.get(word) ?? 0) + 1)
      }
    }

    const topWords = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)

    const byBoard = [...boardCnt.entries()].sort((a, b) => b[1] - a[1])

    return { topWords, byBoard }
  }, [posts])

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">트렌드</h1>
            <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
              ← 메인
            </Link>
          </div>
          <p className="text-zinc-400 text-sm">
            최근 7일 게시글 기준으로 키워드/게시판 분포를 요약합니다.
          </p>
        </header>

        {loading ? (
          <section className="bg-zinc-900 rounded-xl p-4 text-zinc-300">
            불러오는 중...
          </section>
        ) : error ? (
          <section className="bg-zinc-900 rounded-xl p-4 text-red-300">
            트렌드를 불러오지 못했어요: {error}
            <div className="mt-2 text-zinc-400 text-sm">
              (Supabase posts 테이블/created_at 컬럼, Netlify 환경변수 확인)
            </div>
          </section>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <section className="bg-zinc-900 rounded-xl p-4">
              <div className="font-semibold mb-3">인기 키워드 TOP 20</div>
              {topWords.length === 0 ? (
                <div className="text-zinc-400 text-sm">최근 7일 글이 아직 없어요.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {topWords.map(([w, c]) => (
                    <span
                      key={w}
                      className="px-3 py-1 rounded-full bg-zinc-800 text-sm"
                      title={`${c}회`}
                    >
                      {w} <span className="text-zinc-400">({c})</span>
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-zinc-900 rounded-xl p-4">
              <div className="font-semibold mb-3">게시판별 글 개수(최근 7일)</div>
              {byBoard.length === 0 ? (
                <div className="text-zinc-400 text-sm">데이터가 없어요.</div>
              ) : (
                <div className="space-y-2">
                  {byBoard.map(([b, c]) => (
                    <div key={b} className="flex items-center justify-between">
                      <span className="text-zinc-200">{b}</span>
                      <span className="text-zinc-400 text-sm">{c}개</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        <div className="text-xs text-zinc-500">
          ※ 다음 단계에서 댓글까지 포함/가중치/최근 24시간 트렌드 등으로 고도화 가능
        </div>
      </div>
    </main>
  )
}
