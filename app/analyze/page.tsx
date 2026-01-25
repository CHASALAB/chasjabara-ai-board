'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

import SiteHeader from '@/app/components/SiteHeader'
import NoticeBanner from '@/app/components/NoticeBanner'
import { getSupabaseBrowser } from '@/lib/supabase'
import {
  MIN_EVIDENCE_SAMPLE,
  shouldHideEvidence,
  shouldHideKeyword,
  bucketCount,
  maskKeyword,
  tokenize,
} from '@/lib/anonymity'

type LoadState = 'idle' | 'loading' | 'done' | 'error'

type RowLike = {
  id: string
  content?: string | null
  title?: string | null
  created_at?: string | null
}

// 너무 흔한 단어는 집계에서 제외(원하면 추가/삭제 가능)
const STOPWORDS = new Set([
  '그냥',
  '진짜',
  '근데',
  '이거',
  '저거',
  '저는',
  '나는',
  '너는',
  '그리고',
  '그래서',
  '근데',
  '이런',
  '저런',
  '합니다',
  '했다',
  '하는',
  '에서',
  '으로',
  '에게',
  '하고',
  '있는',
  '없음',
  '있음',
  'the',
  'and',
  'or',
  'to',
  'of',
  'in',
  'is',
  'are',
])

function sanitizeQuery(input: string) {
  // useSearchParams 값이 .or() 같은 곳에 들어갈 수도 있어서
  // 최소한의 위험 문자만 정리
  return (input ?? '')
    .replace(/[%,()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toISODateDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function AnalyzeInner() {
  const sp = useSearchParams()
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseBrowser(), [])

  // URL 파라미터
  const rawQ = (sp.get('q') ?? '').trim()
  const q = useMemo(() => sanitizeQuery(rawQ), [rawQ])

  const range = (sp.get('range') ?? '7').trim() // '7' | '30' | 'all'
  const wPost = Number(sp.get('wpost') ?? '2') // 글 가중치
  const wComment = Number(sp.get('wcomment') ?? '1') // 댓글 가중치

  const [state, setState] = useState<LoadState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [rows, setRows] = useState<
    { keyword: string; score: number; postHits: number; commentHits: number }[]
  >([])
  const [meta, setMeta] = useState<any>(null)

  // UI 입력 상태(폼용)
  const [inputQ, setInputQ] = useState(rawQ)
  useEffect(() => setInputQ(rawQ), [rawQ])

  function applyQuery(next: { q?: string; range?: string; wpost?: number; wcomment?: number }) {
    const params = new URLSearchParams(sp.toString())
    if (next.q !== undefined) params.set('q', next.q)
    if (next.range !== undefined) params.set('range', next.range)
    if (next.wpost !== undefined) params.set('wpost', String(next.wpost))
    if (next.wcomment !== undefined) params.set('wcomment', String(next.wcomment))
    router.push(`/analyze?${params.toString()}`)
  }

  useEffect(() => {
    let mounted = true

    async function load() {
      setErrorMsg('')
      setRows([])
      setMeta(null)

      if (!q) {
        setState('idle')
        return
      }

      setState('loading')

      try {
        const sinceISO =
          range === '7' ? toISODateDaysAgo(7) : range === '30' ? toISODateDaysAgo(30) : null

        // 1) posts 가져오기
        let postsQuery = supabase.from('posts').select('id,title,content,created_at')
        if (sinceISO) postsQuery = postsQuery.gte('created_at', sinceISO)

        // ✅ 너무 많아지면 성능 떨어지니까 제한(필요하면 늘려도 됨)
        const { data: posts, error: postsErr } = await postsQuery.order('created_at', { ascending: false }).limit(800)
        if (postsErr) throw postsErr

        // 2) comments 가져오기
        let commentsQuery = supabase.from('comments').select('id,content,created_at')
        if (sinceISO) commentsQuery = commentsQuery.gte('created_at', sinceISO)

        const { data: comments, error: commentsErr } = await commentsQuery.order('created_at', { ascending: false }).limit(1200)
        if (commentsErr) throw commentsErr

        // 3) 키워드 집계(글/댓글 따로 카운트하고 가중치 적용)
        const map = new Map<
          string,
          { keyword: string; score: number; postHits: number; commentHits: number }
        >()

        function addHit(token: string, from: 'post' | 'comment') {
          const t = token.trim()
          if (!t) return
          if (t.length < 2) return
          if (STOPWORDS.has(t)) return

          const cur = map.get(t) ?? { keyword: t, score: 0, postHits: 0, commentHits: 0 }

          if (from === 'post') {
            cur.postHits += 1
            cur.score += Math.max(0, wPost || 0)
          } else {
            cur.commentHits += 1
            cur.score += Math.max(0, wComment || 0)
          }

          map.set(t, cur)
        }

        ;(posts ?? []).forEach((p: any) => {
          const text = `${p?.title ?? ''} ${p?.content ?? ''}`
          tokenize(text).forEach((t) => addHit(t, 'post'))
        })

        ;(comments ?? []).forEach((c: any) => {
          const text = `${c?.content ?? ''}`
          tokenize(text).forEach((t) => addHit(t, 'comment'))
        })

        // 4) 정렬/상위 N개
        const arr = Array.from(map.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, 40)

        if (!mounted) return
        setRows(arr)
        setMeta({
          q,
          range,
          sinceISO,
          wPost,
          wComment,
          postsFetched: (posts ?? []).length,
          commentsFetched: (comments ?? []).length,
          uniqueKeywords: map.size,
        })
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
  }, [q, range, wPost, wComment, supabase])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">분석</h1>
        <Link href="/" className="text-sm text-zinc-300 hover:text-white">
          ← 메인
        </Link>
      </div>

      {/* 검색/필터 */}
      <div className="bg-zinc-900 rounded-xl p-4 space-y-3">
        <div className="text-sm text-zinc-300 font-semibold">키워드 분석</div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            value={inputQ}
            onChange={(e) => setInputQ(e.target.value)}
            placeholder="예) 차사잡아라"
            className="w-full md:flex-1 rounded-lg bg-zinc-950/60 px-3 py-2 text-sm outline-none border border-zinc-800"
          />
          <button
            onClick={() => applyQuery({ q: inputQ.trim() })}
            className="rounded-lg bg-white text-zinc-900 px-3 py-2 text-sm font-semibold hover:bg-zinc-200"
          >
            분석
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-center text-xs text-zinc-300">
          <span className="text-zinc-400">기간</span>
          <button
            onClick={() => applyQuery({ range: '7' })}
            className={`px-2 py-1 rounded border ${range === '7' ? 'bg-zinc-200 text-zinc-900 border-zinc-200' : 'border-zinc-700 hover:border-zinc-500'}`}
          >
            7일
          </button>
          <button
            onClick={() => applyQuery({ range: '30' })}
            className={`px-2 py-1 rounded border ${range === '30' ? 'bg-zinc-200 text-zinc-900 border-zinc-200' : 'border-zinc-700 hover:border-zinc-500'}`}
          >
            30일
          </button>
          <button
            onClick={() => applyQuery({ range: 'all' })}
            className={`px-2 py-1 rounded border ${range === 'all' ? 'bg-zinc-200 text-zinc-900 border-zinc-200' : 'border-zinc-700 hover:border-zinc-500'}`}
          >
            전체
          </button>

          <span className="ml-2 text-zinc-400">가중치</span>
          <span className="text-zinc-400">글</span>
          <button
            onClick={() => applyQuery({ wpost: Math.max(0, wPost - 1) })}
            className="px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500"
          >
            -
          </button>
          <span className="min-w-[24px] text-center">{wPost}</span>
          <button
            onClick={() => applyQuery({ wpost: wPost + 1 })}
            className="px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500"
          >
            +
          </button>

          <span className="ml-2 text-zinc-400">댓글</span>
          <button
            onClick={() => applyQuery({ wcomment: Math.max(0, wComment - 1) })}
            className="px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500"
          >
            -
          </button>
          <span className="min-w-[24px] text-center">{wComment}</span>
          <button
            onClick={() => applyQuery({ wcomment: wComment + 1 })}
            className="px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500"
          >
            +
          </button>
        </div>

        <div className="text-xs text-zinc-500">
          예) <span className="text-zinc-300">/analyze?q=차사잡아라&amp;range=7&amp;wpost=2&amp;wcomment=1</span>
        </div>
      </div>

      {/* 상태 */}
      {state === 'idle' && (
        <div className="bg-zinc-900 rounded-xl p-4 text-zinc-300">
          q 파라미터가 없어서 분석을 실행하지 않았어요.
        </div>
      )}

      {state === 'loading' && (
        <div className="bg-zinc-900 rounded-xl p-4 text-zinc-300">분석 중…</div>
      )}

      {state === 'error' && (
        <div className="bg-zinc-900 rounded-xl p-4 text-zinc-300 space-y-2">
          <div className="font-semibold">분석 실패</div>
          <div className="text-zinc-400 text-sm whitespace-pre-line">{errorMsg}</div>
        </div>
      )}

      {/* 결과 */}
      {state === 'done' && (
        <div className="space-y-4">
          <div className="bg-zinc-900 rounded-xl p-4 text-xs text-zinc-400 space-y-1">
            <div>
              기간: <b className="text-zinc-200">{range === 'all' ? '전체' : `${range}일`}</b>
              {meta?.sinceISO ? <span className="ml-2">(since {meta.sinceISO})</span> : null}
            </div>
            <div>
              가져온 데이터: 글 <b className="text-zinc-200">{meta?.postsFetched ?? 0}</b>개 / 댓글{' '}
              <b className="text-zinc-200">{meta?.commentsFetched ?? 0}</b>개
            </div>
            <div>
              고유 키워드: <b className="text-zinc-200">{meta?.uniqueKeywords ?? 0}</b>
            </div>
            <div className="text-zinc-500">
              ※ 표본이 너무 적으면(기본 {MIN_EVIDENCE_SAMPLE} 미만) 키워드/근거를 숨깁니다.
            </div>
          </div>

          <section className="bg-zinc-900 rounded-xl p-4">
            {rows.length === 0 ? (
              <div className="text-zinc-300">분석 결과가 없습니다.</div>
            ) : (
              <ul className="space-y-2">
                {rows.map((r, idx) => {
                  // “근거”는 score 기준으로 보호
                  const hideEvidence = shouldHideEvidence(r.score, MIN_EVIDENCE_SAMPLE)
                  const hideKeyword = shouldHideKeyword(r.score, MIN_EVIDENCE_SAMPLE)
                  const shownKeyword = hideKeyword ? maskKeyword(r.keyword) : r.keyword

                  return (
                    <li
                      key={`${r.keyword}-${idx}`}
                      className="flex items-center justify-between rounded-lg bg-zinc-950/40 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 text-sm w-6">{idx + 1}</span>
                        <span className="font-medium">{shownKeyword}</span>
                        {hideKeyword && (
                          <span className="text-[11px] text-zinc-500">(표본 보호)</span>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-zinc-200">
                          {hideEvidence ? `${bucketCount(r.score)}점` : `${r.score}점`}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          글 {r.postHits} / 댓글 {r.commentHits}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default function AnalyzePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <SiteHeader />
        <NoticeBanner />

        <Suspense
          fallback={
            <div className="bg-zinc-900 rounded-xl p-4 text-zinc-300">
              분석 페이지 준비 중…
            </div>
          }
        >
          <AnalyzeInner />
        </Suspense>
      </div>
    </main>
  )
}
