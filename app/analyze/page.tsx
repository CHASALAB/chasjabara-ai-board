'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import SiteHeader from '@/app/components/SiteHeader'
import NoticeBanner from '@/app/components/NoticeBanner'
import { getSupabaseBrowser } from '@/lib/supabase'

type LoadState = 'idle' | 'loading' | 'done' | 'error'

function sanitizeForOrQuery(input: string) {
  // PostgREST .or() 문자열에서 문제 일으키기 쉬운 문자 최소한 제거
  // (쉼표/괄호/퍼센트 등)
  return (input ?? '')
    .replace(/[%,()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function AnalyzeInner() {
  const sp = useSearchParams()
  const supabase = useMemo(() => getSupabaseBrowser(), [])

  // 예: ?q=키워드 형태로 분석 쿼리 받는다고 가정
  const rawQ = (sp.get('q') ?? '').trim()
  const q = useMemo(() => sanitizeForOrQuery(rawQ), [rawQ])

  const [state, setState] = useState<LoadState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      setErrorMsg('')
      setResult(null)

      // q 없으면 그냥 대기 화면
      if (!q) {
        setState('idle')
        return
      }

      setState('loading')

      try {
        // ✅ head:true면 data는 거의 항상 null이고,
        //    count는 응답의 count에 들어가므로 count를 써야 함.
        const { count, error } = await supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .or(`title.ilike.%${q}%,content.ilike.%${q}%`)

        if (error) throw error

        if (!mounted) return
        setResult({ q, count: count ?? 0 })
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
  }, [q, supabase])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">분석</h1>
        <Link href="/" className="text-sm text-zinc-300 hover:text-white">
          ← 메인
        </Link>
      </div>

      <div className="bg-zinc-900 rounded-xl p-4 space-y-2">
        <div className="text-sm text-zinc-400">현재 검색 파라미터</div>
        <div className="text-zinc-200 break-all">
          q: <b>{q || '(없음)'}</b>
        </div>
        <div className="text-xs text-zinc-500">예) /analyze?q=차사잡아라</div>
        {rawQ !== q && rawQ && (
          <div className="text-xs text-zinc-500">
            ※ 안전하게 처리하려고 일부 문자를 정리했어요.
          </div>
        )}
      </div>

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

      {state === 'done' && (
        <div className="bg-zinc-900 rounded-xl p-4 text-zinc-200">
          <div className="font-semibold mb-2">결과</div>
          <pre className="text-xs text-zinc-300 whitespace-pre-wrap break-words">
{JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="bg-zinc-900 rounded-xl p-4 text-xs text-zinc-500">
        ※ 다음 고급화: "유저 프로필(/u/닉네임)", "최근 7일/30일 필터", "가중치(글 &gt; 댓글)", "트렌드 그래프" 가능
      </div>
    </div>
  )
}

export default function AnalyzePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <SiteHeader />
        <NoticeBanner />

        {/* ✅ 핵심: useSearchParams() 사용하는 컴포넌트를 Suspense로 감싸기 */}
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
