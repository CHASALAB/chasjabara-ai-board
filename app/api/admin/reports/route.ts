import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

function isAdmin(req: Request) {
  const key = req.headers.get('x-admin-key') ?? ''
  return !!process.env.ADMIN_KEY && key === process.env.ADMIN_KEY
}

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}
