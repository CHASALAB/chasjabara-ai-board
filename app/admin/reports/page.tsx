'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Report = {
  id: string
  target_type: 'post' | 'comment'
  target_id: string
  board: string | null
  reason: string | null
  reporter: string | null
  created_at: string
  resolved?: boolean | null
}

export default function AdminReportsPage() {
  const [adminKey, setAdminKey] = useState('')
  const [rows, setRows] = useState<Report[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/reports', {
        headers: { 'x-admin-key': adminKey },
      })
      const data = await res.json()
      if (!data.ok) {
        alert('관리자 키가 틀렸거나 권한이 없습니다.')
        return
      }
      setRows(data.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function unhide(r: Report) {
    await fetch('/api/admin/unhide', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ type: r.target_type, targetId: r.target_id }),
    })
    alert('숨김 해제 요청 완료')
  }

  async function resolve(r: Report) {
    await fetch('/api/admin/resolve', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ reportId: r.id }),
    })
    alert('처리 완료')
    load()
  }

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_key') ?? ''
    if (saved) setAdminKey(saved)
  }, [])

  useEffect(() => {
    if (adminKey) sessionStorage.setItem('admin_key', adminKey)
  }, [adminKey])

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">신고 관리</h1>
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
            ← 메인
          </Link>
        </header>

        <div className="flex gap-2">
          <input
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="ADMIN_KEY 입력"
            className="flex-1 rounded-lg px-3 py-2 bg-zinc-900 border border-zinc-800"
          />
          <button onClick={load} className="rounded-lg px-4 py-2 bg-red-600 hover:bg-red-700">
            {loading ? '불러오는 중...' : '불러오기'}
          </button>
        </div>

        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">
                  [{r.target_type}] {r.board ?? '-'}
                </div>
                <div className="text-xs text-zinc-400">{new Date(r.created_at).toLocaleString()}</div>
              </div>

              <div className="mt-2 text-sm text-zinc-200">
                target_id: <span className="text-zinc-400">{r.target_id}</span>
              </div>

              <div className="mt-2 text-sm text-zinc-300">
                사유: <span className="text-zinc-200">{r.reason ?? '(없음)'}</span>
              </div>

              <div className="mt-2 text-xs text-zinc-500">reporter: {r.reporter ?? '(없음)'}</div>

              <div className="mt-3 flex gap-2">
                <button onClick={() => unhide(r)} className="rounded-lg px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm">
                  숨김 해제
                </button>
                <button onClick={() => resolve(r)} className="rounded-lg px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm">
                  처리완료
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-zinc-500">
          관리자 페이지 주소: <b>/admin/reports</b>
        </p>
      </div>
    </main>
  )
}
