'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import SiteHeader from '@/app/components/SiteHeader'
import NoticeBanner from '@/app/components/NoticeBanner'
import { getSupabaseBrowser } from '@/lib/supabase'
import { shouldHideEvidence, MIN_EVIDENCE_SAMPLE, bucketCount } from '@/lib/anonymity'

type RisingRow = {
  keyword: string
  cnt: number
  prev_cnt: number
  delta: number
  ratio: number | null
}

type TrendRow = { keyword: string; cnt: number }

type RisingByBoardRow = RisingRow & { board: string }
type TrendByBoardRow = TrendRow & { board: string }

type LoadState = 'idle' | 'loading' | 'done' | 'error'

const DEFAULT_BOARDS = ['징벌', '주행', '메타', '자유']

function uniq(arr: string[]) {
  return Array.from(new Set(arr)).filter(Boolean)
}

export default function OpsTopicPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), [])

  const [state, setState] = useState<LoadState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const [tab, setTab] = useState<'all' | 'board'>('all')
  const [board, setBoard] = useState<string>(DEFAULT_BOARDS[0])

  const [risingAll, setRisingAll] = useState<RisingRow[]>([])
  const [trendAll, setTrendAll] = useState<TrendRow[]>([])

  const [boards, setBoards] = useState<string[]>(DEFAULT_BOARDS)
  const [risingBoard, setRisingBoard] = useState<RisingByBoardRow[]>([])
  const [trendBoard, setTrendBoard] = useState<TrendByBoardRow[]>([])

  // 1) 탭 데이터 로드
  useEffect(() => {
    let mounted = true

    async function loadAll() {
      setState('loading')
      setErrorMsg('')

      try {
        // 전체 급상승
        const { data: rData, error: rErr } = await supabase
          .from('rising_keywords_24h')
          .select('keyword,cnt,prev_cnt,delta,ratio')
          .order('delta', { ascending: false })
          .limit(20)

        // 전체 트렌드
        const { data: tData, error: tErr } = await supabase
          .from('trend_keywords_7d')
          .select('keyword,cnt')
          .order('cnt', { ascending: false })
          .limit(20)

        const rRows = rErr ? [] : ((rData ?? []) as RisingRow[])
        const tRows = tErr ? [] : ((tData ?? []) as TrendRow[])

        // 게시판 목록(뷰가 있으면 그걸로 추출)
        const { data: bData, error: bErr } = await supabase
          .from('trend_keywords_by_board_7d')
          .select('board')
          .limit(200)

        const foundBoards = bErr ? [] : uniq((bData ?? []).map((x: any) => x.board))

        if (!mounted) return
        setRisingAll(rRows)
        setTrendAll(tRows)
        if (foundBoards.length > 0) setBoards(foundBoards)

        // 전체 데이터가 하나도 없으면 에러 안내
        if ((rRows.length === 0 && tRows.length === 0) && bErr) {
          setState('error')
          setErrorMsg(
            '이슈/트렌드 데이터를 불러올 소스가 없어요. rising_keywords_24h / trend_keywords_7d 뷰가 필요합니다.'
          )
          return
        }

        setState('done')
      } catch (e: any) {
        if (!mounted) return
        setState('error')
        setErrorMsg(e?.message ?? '알 수 없는 오류')
      }
    }

    loadAll()
    return () => {
      mounted = false
    }
  }, [supabase])

  // 2) 게시판 선택 시 해당 게시판 데이터 로드
  useEffect(() => {
    let mounted = true

    async function loadBoard() {
      setRisingBoard([])
      setTrendBoard([])

      try {
        const { data: rData, error: rErr } = await supabase
          .from('rising_keywords_by_board_24h')
          .select('board,keyword,cnt,prev_cnt,delta,ratio')
          .eq('board', board)
          .order('delta', { ascending: false })
          .limit(20)

        const { data: tData, error: tErr } = await supabase
          .from('trend_keywords_by_board_7d')
          .select('board,keyword,cnt')
          .eq('board', board)
          .order('cnt', { ascending: false })
          .limit(20)

        if (!mounted) return
        setRisingBoard(rErr ? [] : ((rData ?? []) as RisingByBoardRow[]))
        setTrendBoard(tErr ? [] : ((tData ?? []) as TrendByBoardRow[]))
      } catch {
        // 조용히 무시(탭 UI는 유지)
      }
    }

    if (tab === 'board' && board) loadBoard()
    return () => {
      mounted = false
    }
  }, [supabase, tab, board])

  const TabBtn = ({
    active,
    children,
    onClick,
  }: {
    active: boolean
    children: React.ReactNode
    onClick: () => void
  }) => (
    <button
      onClick={onClick}
      className={
        active
          ? 'px-3 py-2 rounded-lg bg-zinc-200 text-zinc-900 text-sm font-semibold'
          : 'px-3 py-2 rounded-lg bg-zinc-900 text-zinc-200 text-sm hover:bg-zinc-800'
      }
      type="button"
    >
      {children}
    </button>
  )

  const BoardPill = ({ name }: { name: string }) => (
    <button
      type="button"
      onClick={() => setBoard(name)}
      className={
        name === board
          ? 'text-xs px-3 py-1 rounded-full bg-red-600 text-white'
          : 'text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
      }
    >
      {name}
    </button>
  )

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <SiteHeader />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">이슈 요약</h1>
          <Link href="/" className="text-sm text-zinc-300 hover:text-white">
            ← 메인
          </Link>
        </div>

        <NoticeBanner />

        <section className="bg-zinc-900 rounded-xl p-4 text-xs text-zinc-400 space-y-1">
          <div>완전 익명 원칙: 표본이 적으면 “정확한 수치/증감/근거”를 숨기고 키워드만 노출합니다.</div>
          <div>표본 {MIN_EVIDENCE_SAMPLE} 미만이면 건수는 범위로 표시됩니다.</div>
        </section>

        {/* 탭 */}
        <div className="flex items-center gap-2">
          <TabBtn active={tab === 'all'} onClick={() => setTab('all')}>
            전체
          </TabBtn>
          <TabBtn active={tab === 'board'} onClick={() => setTab('board')}>
            게시판별
          </TabBtn>
        </div>

        {/* 게시판 선택 */}
        {tab === 'board' && (
          <div className="flex flex-wrap gap-2">
            {boards.map((b) => (
              <BoardPill key={b} name={b} />
            ))}
          </div>
        )}

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
            {/* 급상승 */}
            <section className="bg-zinc-900 rounded-xl p-4 space-y-3">
              <div className="font-semibold">
                급상승 (최근 24시간){tab === 'board' ? ` · ${board}` : ''}
              </div>

              {(tab === 'all' ? risingAll : risingBoard).length === 0 ? (
                <div className="text-sm text-zinc-300">급상승 데이터가 없습니다.</div>
              ) : (
                <ul className="space-y-2">
                  {(tab === 'all' ? risingAll : risingBoard).map((r: any, idx: number) => {
                    const hide = shouldHideEvidence(r.cnt, MIN_EVIDENCE_SAMPLE)
                    return (
                      <li
                        key={`${r.keyword}-${idx}`}
                        className="rounded-lg bg-zinc-950/40 px-3 py-2 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400 text-sm w-6">{idx + 1}</span>
                          <Link
                            href={`/topic/keyword/${encodeURIComponent(r.keyword)}`}
                            className="font-medium hover:underline"
                          >
                            {r.keyword}
                          </Link>
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-zinc-200">
                            {hide ? `${bucketCount(r.cnt)}건` : `${r.cnt}건`}
                          </div>

                          {hide ? (
                            <div className="text-xs text-zinc-500">
                              표본 {MIN_EVIDENCE_SAMPLE} 미만: 증감 숨김
                            </div>
                          ) : (
                            <div className="text-xs text-zinc-400">
                              Δ {r.delta} / 이전 {r.prev_cnt}
                              {r.ratio !== null ? ` (x${r.ratio})` : ''}
                            </div>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {/* 트렌드 */}
            <section className="bg-zinc-900 rounded-xl p-4 space-y-3">
              <div className="font-semibold">
                최근 7일 트렌드{tab === 'board' ? ` · ${board}` : ''}
              </div>

              {(tab === 'all' ? trendAll : trendBoard).length === 0 ? (
                <div className="text-sm text-zinc-300">트렌드 데이터가 없습니다.</div>
              ) : (
                <ul className="space-y-2">
                  {(tab === 'all' ? trendAll : trendBoard).map((t: any, idx: number) => {
                    const hide = shouldHideEvidence(t.cnt, MIN_EVIDENCE_SAMPLE)
                    return (
                      <li
                        key={`${t.keyword}-${idx}`}
                        className="rounded-lg bg-zinc-950/40 px-3 py-2 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-400 text-sm w-6">{idx + 1}</span>
                          <Link
                            href={`/topic/keyword/${encodeURIComponent(t.keyword)}`}
                            className="font-medium hover:underline"
                          >
                            {t.keyword}
                          </Link>
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-zinc-200">
                            {hide ? `${bucketCount(t.cnt)}건` : `${t.cnt}건`}
                          </div>
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
          </>
        )}
      </div>
    </main>
  )
}