'use client'

import { useState } from 'react'

export default function ReportButton(props: {
  type: 'post' | 'comment'
  targetId: string
  board?: string
  reporter?: string
  compact?: boolean
}) {
  const [loading, setLoading] = useState(false)

  async function onReport() {
    if (loading) return
    const ok = confirm('신고하시겠습니까? (누적 3회 이상이면 자동 숨김 처리됩니다)')
    if (!ok) return

    const reason = prompt('신고 사유(선택)', '') ?? ''

    setLoading(true)
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: props.type,
          targetId: props.targetId,
          board: props.board ?? null,
          reporter: props.reporter ?? null,
          reason: reason || null,
        }),
      })
      const data = await res.json()
      if (!data.ok) return alert('신고 실패: ' + (data.message ?? 'error'))

      alert(`신고 접수 완료! (누적: ${data.reportCount})`)
      if (data.hidden) location.reload()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={onReport}
      disabled={loading}
      className={
        props.compact
          ? 'text-xs text-zinc-400 hover:text-red-400'
          : 'rounded-lg px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-200'
      }
      title="신고"
    >
      {loading ? '처리중...' : '신고'}
    </button>
  )
}
