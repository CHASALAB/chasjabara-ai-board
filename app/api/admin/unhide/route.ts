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
  const type = body?.type as 'post' | 'comment'
  const targetId = body?.targetId as string
  if (!type || !targetId) return NextResponse.json({ ok: false }, { status: 400 })

  if (type === 'post') {
    await supabaseAdmin.from('posts').update({ hidden: false }).eq('id', targetId)
  } else {
    await supabaseAdmin.from('comments').update({ hidden: false }).eq('id', targetId)
  }

  return NextResponse.json({ ok: true })
}
