
'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import SiteHeader from '@/app/components/SiteHeader'
import NoticeBanner from '@/app/components/NoticeBanner'

import { getSupabaseBrowser } from '@/lib/supabase'
import {
  MIN_EVIDENCE_SAMPLE,
  shouldHideEvidence,
  shouldHideKeyword,
  bucketCount,
  maskKeyword,
} from '@/lib/anonymity'

type RisingRow = {
  keyword: string
  recent_cnt: number
  prev_cnt: number
  delta: number
  score: number
}

type LoadState = 'idle' | 'loading' | 'done' | 'error'

export default function RisingTrendPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), [])

  const [state, setState] = useState<LoadState>('idle')
  const [rows, setRows] = useState<RisingRow[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let mounted = true

    async function load() {
      setState('loading')
      setErrorMsg('')
      setRows([])

      try {
        const { data, error } = await supabase
          .from('trend_rising_keywords')
          .select('keyword,recent_cnt,prev_cnt,delta,score')
          .order('score', { ascending: false })
          .limit(50)

        if (error) throw error
        if (!mounted) return

        setRows((data ?? []) as RisingRow[])
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
      <div className="max-w-3xl mx-auto space-y-6">
        <SiteHeader />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">급상승 트렌드</h1>
          <div className="flex items-center gap-3">
            <Link href="/trend" className="text-sm text-zinc-300 hover:text-white">
              트렌드
            </Link>
            <Link href="/" className="text-sm text-zinc-300 hover:text-white">
              ← 메인
            </Link>
          </div>
        </div>

        <NoticeBanner />

        <section className="bg-zinc-900 rounded-xl p-4 space-y-2">
          <div className="text-zinc-200 font-semibold">완전 익명 규칙</div>
          <div className="text-xs text-zinc-500">
            표본 {MIN_EVIDENCE_SAMPLE} 미만이면 키워드/정확수치 숨김(범위표시), 링크도 숨김
          </div>
          <div className="text-xs text-zinc-500">
            급상승 기준: 최근 24시간 vs 이전 7일(최근 24시간 제외) 비율(score)
          </div>
        </section>

        {state === 'loading' && (
          <div className="bg-zinc-900 rounded-xl p-4 text-zinc-300">불러오는 중…</div>
        )}

        {state === 'error' && (
          <div className="bg-zinc-900 rounded-xl p-4 text-zinc-300 space-y-2">
            <div className="font-semibold">불러오기 실패</div>
            <div className="text-zinc-400 text-sm whitespace-pre-line">{errorMsg}</div>
            <div className="text-zinc-500 text-xs">
              ※ Supabase에 trend_rising_keywords 뷰가 있어야 합니다 (D-4-1 실행)
            </div>
          </div>
        )}

        {state === 'done' && (
          <section className="bg-zinc-900 rounded-xl p-4">
            {rows.length === 0 ? (
              <div className="text-zinc-300">아직 급상승 데이터가 없습니다.</div>
            ) : (
              <ul className="space-y-2">
                {rows.map((r, idx) => {
                  const evidenceHide = shouldHideEvidence(r.recent_cnt, MIN_EVIDENCE_SAMPLE)
                  const kwHide = shouldHideKeyword(r.recent_cnt, MIN_EVIDENCE_SAMPLE)

                  const shownRecent = evidenceHide ? bucketCount(r.recent_cnt) : `${r.recent_cnt}`
                  const shownPrev = evidenceHide ? bucketCount(r.prev_cnt) : `${r.prev_cnt}`
                  const label = kwHide ? '비공개 키워드' : maskKeyword(r.keyword)

                  return (
                    <li
                      key={`${r.keyword}-${idx}`}
                      className="flex items-center justify-between rounded-lg bg-zinc-950/40 px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-zinc-400 text-sm w-6">{idx + 1}</span>

                        {kwHide ? (
                          <span className="font-medium text-zinc-300">{label}</span>
                        ) : (
                          <Link
                            className="font-medium hover:underline truncate"
                            href={`/topic/keyword/${encodeURIComponent(r.keyword)}`}
                          >
                            {label}
                          </Link>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-zinc-200">
                          최근 {shownRecent} · 이전 {shownPrev}
                        </div>
                        <div className="text-xs text-zinc-500">
                          Δ {r.delta} · score {Number(r.score).toFixed(2)}
                        </div>
                        {evidenceHide && (
                          <div className="text-xs text-zinc-500">
                            표본 {MIN_EVIDENCE_SAMPLE} 미만: 근거/정확수치 숨김
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
