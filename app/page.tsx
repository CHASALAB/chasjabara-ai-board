import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold">테일즈런너 차사잡아라 AI 익명 게시판</h1>
          <p className="text-zinc-400">
            익명 기반 커뮤니티 · 데이터가 쌓일수록 “이 사람 어때?” 분석 정확도가 올라갑니다.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/analyze" className="rounded-lg px-4 py-2 bg-red-600 hover:bg-red-700 text-sm">
              이 사람 어때? 분석
            </Link>
            <Link href="/trend" className="rounded-lg px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm">
              트렌드 보기
            </Link>
            <Link href="/rules" className="rounded-lg px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm">
              운영 규칙
            </Link>
          </div>
        </header>

        <section className="bg-zinc-900 rounded-xl p-5 space-y-3">
          <div className="font-semibold">게시판 바로가기</div>
          <div className="flex flex-wrap gap-2">
            {['징벌', '주행', '서폿', '메타', '자유', '이 사람 어때?'].map((b) => (
              <Link
                key={b}
                href={`/board/${encodeURIComponent(b)}`}
                className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
              >
                {b}
              </Link>
            ))}
          </div>

          <div className="text-xs text-zinc-500">
            TIP: “이 사람 어때?” 게시판에서 닉네임 언급이 쌓이면 분석 품질이 확 올라가요.
          </div>
        </section>

        <section className="bg-zinc-900 rounded-xl p-5 space-y-2">
          <div className="font-semibold">유입 기능(B단계) 적용 완료</div>
          <ul className="list-disc pl-5 text-sm text-zinc-300 space-y-1">
            <li>트렌드 페이지에 “닉네임 언급 TOP” 추가</li>
            <li>분석 페이지(/analyze)로 바로 이동 가능</li>
            <li>데이터 쌓일수록 더 정교해지는 구조</li>
          </ul>
        </section>
      </div>
    </main>
  )
}
