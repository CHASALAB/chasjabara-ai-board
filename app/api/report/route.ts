import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type Body = {
  type: 'post' | 'comment'
  targetId: string
  board?: string | null
  reason?: string | null
  reporter?: string | null
}

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    const { type, targetId } = body

    if (!type || !targetId) {
      return NextResponse.json({ ok: false, message: 'bad request' }, { status: 400 })
    }

    // 1) 신고 기록 저장
    const { error: insErr } = await supabaseAdmin.from('reports').insert([
      {
        target_type: type,
        target_id: targetId,
        board: body.board ?? null,
        reason: body.reason ?? null,
        reporter: body.reporter ?? null,
      },
    ])
    if (insErr) return NextResponse.json({ ok: false, message: insErr.message }, { status: 500 })

    // 2) 누적 신고 수 계산
    const { count } = await supabaseAdmin
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('target_type', type)
      .eq('target_id', targetId)

    const reportCount = count ?? 0
    const shouldHide = reportCount >= 3

    // 3) 대상 업데이트 (posts/comments)
    if (type === 'post') {
      await supabaseAdmin
        .from('posts')
        .update({ report_count: reportCount, hidden: shouldHide })
        .eq('id', targetId)
    } else {
      await supabaseAdmin
        .from('comments')
        .update({ report_count: reportCount, hidden: shouldHide })
        .eq('id', targetId)
    }

    return NextResponse.json({ ok: true, reportCount, hidden: shouldHide })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? 'error' }, { status: 500 })
  }
}
