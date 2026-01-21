'use client'

export default function NoticeBanner() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200">
      <div className="font-semibold mb-1">운영 안내</div>
      <ul className="list-disc pl-5 space-y-1 text-zinc-300">
        <li>실명/비방/개인정보 금지</li>
        <li>신고 누적 3회 이상 자동 숨김 처리</li>
        <li>“이 사람 어때?”는 개인 평가가 아닌 의견 데이터 요약</li>
      </ul>
    </div>
  )
}
