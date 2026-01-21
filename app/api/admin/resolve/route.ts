import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

function isAdmin(req: Request) {
  const key = req.headers.get('x-admin-key') ?? ''
  return !!process.env.ADMIN_KEY && key === process.env.ADMIN_KEY
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await req.json()
  const reportId = body?.reportId as string
  if (!reportId) return NextResponse.json({ ok: false }, { status: 400 })

  // resolved 컬럼이 있으면 update / 없으면 delete로 대체
  const { error } = await supabaseAdmin.from('reports').update({ resolved: true }).eq('id', reportId)
  if (error) {
    await supabaseAdmin.from('reports').delete().eq('id', reportId)
  }

  return NextResponse.json({ ok: true })
}
