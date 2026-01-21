'use client'

import SiteHeader from '@/app/components/SiteHeader'
import NoticeBanner from '@/app/components/NoticeBanner'

export default function RulesPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <SiteHeader />
      <div className="max-w-3xl mx-auto px-5 py-10 space-y-6">
        <h1 className="text-2xl font-bold">운영 규칙</h1>
        <NoticeBanner />

        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3 text-zinc-200">
          <h2 className="text-lg font-semibold">금지</h2>
          <ul className="list-disc pl-5 space-y-1 text-zinc-300">
            <li>실명/연락처/개인정보 언급</li>
            <li>특정인 모욕/비방/낙인(“확정” 표현)</li>
            <li>외부 커뮤니티 분쟁 유도/캡처 유입</li>
          </ul>

          <h2 className="text-lg font-semibold mt-4">신고/숨김 정책</h2>
          <ul className="list-disc pl-5 space-y-1 text-zinc-300">
            <li>신고 누적 3회 이상 시 자동 숨김 처리됩니다.</li>
            <li>운영자는 논쟁에 개입하지 않고 시스템 기준으로만 처리합니다.</li>
          </ul>

          <h2 className="text-lg font-semibold mt-4">분석 안내</h2>
          <p className="text-zinc-300">
            “이 사람 어때?” 결과는 개인에 대한 확정 판단이 아니라, 게시글/댓글 의견의 구조적 요약입니다.
            데이터가 더 쌓일수록 정확도가 올라갑니다.
          </p>
        </section>
      </div>
    </main>
  )
}
