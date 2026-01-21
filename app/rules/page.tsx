import Link from 'next/link'

export default function RulesPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">운영 규칙</h1>
            <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
              ← 메인
            </Link>
          </div>
          <p className="text-zinc-400 text-sm">
            익명 게시판을 안전하게 운영하기 위한 기본 규칙입니다.
          </p>
        </header>

        <section className="bg-zinc-900 rounded-xl p-5 space-y-4 text-zinc-200">
          <div>
            <div className="font-semibold mb-1">1) 익명/개인정보</div>
            <ul className="list-disc pl-5 space-y-1 text-zinc-300">
              <li>실명/전화번호/계정 등 개인정보 공유 금지</li>
              <li>타인의 신상 추측/유포 금지</li>
            </ul>
          </div>

          <div>
            <div className="font-semibold mb-1">2) 비방/혐오/차별</div>
            <ul className="list-disc pl-5 space-y-1 text-zinc-300">
              <li>특정인을 조롱하거나 모욕하는 글 금지</li>
              <li>혐오/차별/폭력 조장 금지</li>
            </ul>
          </div>

          <div>
            <div className="font-semibold mb-1">3) 신고 정책</div>
            <ul className="list-disc pl-5 space-y-1 text-zinc-300">
              <li>게시글/댓글은 누구나 신고할 수 있습니다.</li>
              <li>
                신고가 누적되면 자동으로 숨김 처리될 수 있습니다
                <span className="text-zinc-400 text-sm"> (예: 3회 이상)</span>
              </li>
              <li>악의적 신고는 추후 제한될 수 있습니다.</li>
            </ul>
          </div>

          <div className="text-xs text-zinc-500">
            ※ 운영 가이드는 5단계에서 더 자세히 문서로 정리할 예정
          </div>
        </section>
      </div>
    </main>
  )
}
