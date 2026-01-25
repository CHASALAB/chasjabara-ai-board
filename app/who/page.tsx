'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import SiteHeader from '@/app/components/SiteHeader'
import NoticeBanner from '@/app/components/NoticeBanner'
import { getSupabaseBrowser } from '@/lib/supabase'
import { MIN_EVIDENCE_SAMPLE, shouldHideEvidence } from '@/lib/anonymity'

type StatRow = { posts_cnt: number; comments_cnt: number; total_cnt: number }
type KwRow = { keyword: string; cnt: number }

export default function WhoPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), [])

  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const [stats, setStats] = useState<StatRow | null>(null)
  const [kws, setKws] = useState<KwRow[]>([])

  async function run() {
    const target = q.trim()
    if (!target) return

    setLoading(true)
    setErr('')
    setStats(null)
    setKws([])

    try {
      // 1) 통계
      const { data: sData, error: sErr } = await supabase.rpc('who_stats', { target })
      if (sErr) throw sErr
      const s = (Array.isArray(sData) ? sData[0] : sData) as any
      const stat: StatRow = {
        posts_cnt: Number(s?.posts_cnt ?? 0),
        comments_cnt: Number(s?.comments_cnt ?? 0),
        total_cnt: Number(s?.total_cnt ?? 0),
      }
      setStats(stat)

      // 2) 키워드
      const { data: kData, error: kErr } = await supabase.rpc('who_keywords', { target, lim: 30 })
      if (kErr) throw kErr
      setKws((kData ?? []) as any)
    } catch (e: any) {
      setErr(e?.message ?? '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }

  const hide = shouldHideEvidence(stats?.total_cnt ?? 0, MIN_EVIDENCE_SAMPLE)

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <SiteHeader />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">이 사람 어때?</h1>
          <Link href="/" className="text-sm text-zinc-300 hover:text-white">
            ← 메인
          </Link>
        </div>

        <NoticeBanner />

        <section className="bg-zinc-900 rounded-xl p-4 space-y-3">
          <div className="text-sm text-zinc-300">
            닉네임/키워드를 입력하면, <b>게시글+댓글</b>에서 언급된 내용만 모아 <b>키워드로 집계</b>합니다.
          </div>

          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="예) 나눔 / TimeLeap / 명기 / 도용범 ..."
              className="flex-1 rounded-lg bg-zinc-950/40 border border-zinc-800 px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={run}
              disabled={loading}
              className="rounded-lg px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-sm"
            >
              {loading ? '분석 중…' : '분석'}
            </button>
          </div>

          <div className="text-xs text-zinc-500">
            ※ 완전 익명 원칙: 표본이 적으면(기준 {MIN_EVIDENCE_SAMPLE} 미만) 상세 근거/결정적 표현은 숨깁니다.
          </div>
        </section>

        {err && (
          <div className="bg-zinc-900 rounded-xl p-4 text-zinc-300 space-y-2">
            <div className="font-semibold">오류</div>
            <div className="text-zinc-400 text-sm whitespace-pre-line">{err}</div>
          </div>
        )}

        {stats && (
          <section className="bg-zinc-900 rounded-xl p-4 space-y-2">
            <div className="font-semibold">집계 현황</div>
            <div className="text-sm text-zinc-300">
              게시글 {stats.posts_cnt} · 댓글 {stats.comments_cnt} · 총 {stats.total_cnt}
            </div>

            {hide ? (
              <div className="text-xs text-zinc-500">
                표본이 {MIN_EVIDENCE_SAMPLE} 미만이라 “근거/결정적 표현”은 숨김 처리합니다. (요약 수준만 제공)
              </div>
            ) : (
              <div className="text-xs text-zinc-500">
                표본이 충분해서 키워드 기반 요약이 비교적 안정적입니다.
              </div>
            )}
          </section>
        )}

        {stats && (
          <section className="bg-zinc-900 rounded-xl p-4">
            <div className="font-semibold mb-3">자주 같이 언급된 키워드</div>

            {kws.length === 0 ? (
              <div className="text-zinc-300 text-sm">아직 키워드 데이터가 없습니다.</div>
            ) : (
              <ul className="space-y-2">
                {kws.map((r, idx) => (
                  <li
                    key={`${r.keyword}-${idx}`}
                    className="flex items-center justify-between rounded-lg bg-zinc-950/40 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 text-sm w-6">{idx + 1}</span>
                      <span className="font-medium">{r.keyword}</span>
                    </div>
                    <div className="text-sm text-zinc-200">{r.cnt}회</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
