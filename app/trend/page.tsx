'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import SiteHeader from '@/app/components/SiteHeader'
import NoticeBanner from '@/app/components/NoticeBanner'


type TrendRow = { query: string; cnt: number }

export default function TrendPage() {
  const [top, setTop] = useState<TrendRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('analysis_query_counts_7d')
        .select('query,cnt')
        .limit(20)
      setTop((data ?? []) as TrendRow[])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <SiteHeader />
      <div className="max-w-3xl mx-auto px-5 py-10 space-y-6">
        <h1 className="text-2xl font-bold">트렌드</h1>
        <NoticeBanner />

        {loading ? (
          <div className="text-zinc-400">불러오는 중…</div>
        ) : top.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            아직 트렌드 데이터가 없습니다. 메인에서 분석 버튼을 누르면 쌓입니다.
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-sm text-zinc-400 mb-3">최근 7일 분석 실행 TOP</div>
            <ul className="space-y-2">
              {top.map((t, i) => (
                <li key={t.query} className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-100">
                    {i + 1}. {t.query}
                  </span>
                  <span className="text-zinc-400">{t.cnt}회</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  )
}
