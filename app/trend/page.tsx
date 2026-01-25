'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import SiteHeader from '@/app/components/SiteHeader'
import NoticeBanner from '@/app/components/NoticeBanner'

import { getSupabaseBrowser } from '@/lib/supabase'
import { shouldHideEvidence, MIN_EVIDENCE_SAMPLE } from '@/lib/anonymity'

type TrendRow = { keyword: string; cnt: number }
type LoadState = 'idle' | 'loading' | 'done' | 'error'

export default function TrendPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), [])

  const [state, setState] = useState<LoadState>('idle')
  const [rows, setRows] = useState<TrendRow[]>([])
  const [errorMsg, setErrorMsg] = useState<string>('')

  useEffect(() => {
    let mounted = true

    async function load() {
      setState('loading')
      setErrorMsg('')
      setRows([])

      // ✅ 프로젝트마다 트렌드 테이블/뷰 이름이 다를 수 있어서
      //    “있을 법한 이름들”을 순서대로 시도하고, 하나라도 성공하면 표시
      const candidates = ['trend_keywords', 'keyword_trends', 'trending_keywords', 'trends']

      try {
        for (const table of candidates) {
          const { data, error } = await supabase
            .from(table)
            .select('keyword,cnt')
            .order('cnt', { ascending: false })
            .limit(30)

          if (error) continue

          if (!mounted) return
          setRows((data ?? []) as TrendRow[])
          setState('done')
          return
        }

        if (!mounted) return
        setState('error')
        setErrorMsg(
          '트렌드 데이터를 불러올 소스(뷰/테이블)를 찾지 못했어요. (trend_keywords / keyword_trends / trending_keywords / trends 중 하나가 필요)'
        )
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

        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">트렌드</h1>

          <div className="flex items-center gap-2">
            {/* ✅ 급상승 버튼 */}
            <Link
              href="/trend/rising"
              className="rounded-lg px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm"
            >
              급상승
            </Link>

            {/* 메인으로 */}
            <Link
              href="/"
              className="rounded-lg px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-sm text-zinc-200"
            >
              ← 메인
            </Link>
          </div>
        </div>

        <NoticeBanner />

        <section className="bg-zinc-900 rounded-xl p-4 space-y-1">
          <div className="text-zinc-200 font-semibold">익명 보호</div>
          <div className="text-xs text-zinc-500">
            표본 {MIN_EVIDENCE_SAMPLE} 미만이면 “근거 숨김” 표시가 뜰 수 있어요.
          </div>
        </section>

        {state === 'loading' && (
          <div className="bg-zinc-900 rounded-xl p-4 text-zinc-300">
            트렌드 불러오는 중…
          </div>
        )}

        {state === 'error' && (
          <div className="bg-zinc-900 rounded-xl p-4 text-zinc-300 space-y-2">
            <div className="font-semibold">불러오기 실패</div>
            <div className="text-zinc-400 text-sm whitespace-pre-line">{errorMsg}</div>
            <div className="text-zinc-500 text-xs">
              ※ 500이 아니라 화면에서 실패 메시지로 보이게 만든 상태라, 다음 단계(트렌드 소스 만들기)로 안전하게 진행 가능
            </div>
          </div>
        )}

        {state === 'done' && (
          <section className="bg-zinc-900 rounded-xl p-4">
            {rows.length === 0 ? (
              <div className="text-zinc-300">아직 트렌드 데이터가 없습니다.</div>
            ) : (
              <ul className="space-y-2">
                {rows.map((r, idx) => {
                  const hide = shouldHideEvidence(r.cnt, MIN_EVIDENCE_SAMPLE)
                  return (
                    <li
                      key={`${r.keyword}-${idx}`}
                      className="flex items-center justify-between rounded-lg bg-zinc-950/40 px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-zinc-400 text-sm w-6">{idx + 1}</span>
                        <span className="font-medium truncate">{r.keyword}</span>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-zinc-200">{r.cnt}건</div>
                        {hide && (
                          <div className="text-xs text-zinc-500">
                            표본 {MIN_EVIDENCE_SAMPLE} 미만: 근거 숨김
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
