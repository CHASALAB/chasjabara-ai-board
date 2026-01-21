'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type PostRow = {
  id: string
  board: string | null
  title: string | null
  content: string | null
  author: string | null
  created_at?: string | null
}

type CommentRow = {
  id: string
  post_id: string
  content: string | null
  author: string | null
  created_at?: string | null
}

const POS = ['잘함','잘해','고수','좋다','추천','멋','센스','안정','캐리','빠름','깔끔','인정','최고']
const NEG = ['못함','못해','트롤','별로','욕','짜증','패배','민폐','느림','답답','비매너','혐오','최악']
const TAGS: { label: string; keys: string[] }[] = [
  { label: '징/징벌', keys: ['징','징벌','징작','징연습'] },
  { label: '주행', keys: ['주행','라인','드리프트','코너','속도','부스터'] },
  { label: '서폿', keys: ['서폿','서포','보조','힐','지원'] },
  { label: '운영/판단', keys: ['운영','판단','각','콜','시야','포지션'] },
  { label: '멘탈/태도', keys: ['멘탈','비매너','매너','채팅','욕','싸움'] },
]

function countMentions(text: string, q: string) {
  if (!text) return 0
  const t = text.toLowerCase()
  const qq = q.toLowerCase().trim()
  if (!qq) return 0
  let idx = 0
  let cnt = 0
  while (true) {
    idx = t.indexOf(qq, idx)
    if (idx === -1) break
    cnt++
    idx += qq.length
  }
  return cnt
}

function summarize(posts: PostRow[], comments: CommentRow[], name: string) {
  const boardCount = new Map<string, number>()
  let pos = 0
  let neg = 0
  const tagCount = new Map<string, number>()
  let mentionTotal = 0

  const texts: string[] = []
  for (const p of posts) {
    const board = (p.board ?? '기타').toString()
    boardCount.set(board, (boardCount.get(board) ?? 0) + 1)

    const text = `${p.title ?? ''} ${p.content ?? ''}`
    texts.push(text)
  }
  for (const c of comments) texts.push(c.content ?? '')

  for (const t of texts) {
    mentionTotal += countMentions(t, name)
    const low = (t ?? '').toLowerCase()

    for (const w of POS) if (low.includes(w)) pos++
    for (const w of NEG) if (low.includes(w)) neg++

    for (const tag of TAGS) {
      let hit = 0
      for (const k of tag.keys) if (low.includes(k)) hit++
      if (hit) tagCount.set(tag.label, (tagCount.get(tag.label) ?? 0) + hit)
    }
  }

  const topBoards = [...boardCount.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 5)
  const topTags = [...tagCount.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 5)

  const samples = posts.length + comments.length
  const confidence =
    samples >= 30 ? '높음'
    : samples >= 10 ? '중간'
    : samples >= 3 ? '낮음'
    : '매우 낮음'

  const tone =
    pos - neg >= 5 ? '대체로 호평이 많음'
    : neg - pos >= 5 ? '부정 의견이 상대적으로 많음'
    : '호불호가 섞여 있음'

  return { topBoards, topTags, samples, confidence, pos, neg, tone, mentionTotal }
}

export default function AnalyzePage() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [comments, setComments] = useState<CommentRow[]>([])
  const [err, setErr] = useState<string | null>(null)

  const result = useMemo(() => {
    const n = name.trim()
    if (!n) return null
    return summarize(posts, comments, n)
  }, [posts, comments, name])

  async function run() {
    const n = name.trim()
    if (!n) return alert('닉네임(또는 별칭)을 입력해줘!')
    setLoading(true)
    setErr(null)
    try {
      // 최근 90일 데이터에서 검색 (너무 과하게 안 긁어오게)
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

      const { data: pData, error: pErr } = await supabase
        .from('posts')
        .select('id, board, title, content, author, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(400)

      if (pErr) throw pErr

      const { data: cData, error: cErr } = await supabase
        .from('comments')
        .select('id, post_id, content, author, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(600)

      if (cErr) throw cErr

      // 이름이 들어간 것만 필터링
      const pn = n.toLowerCase()
      const matchedPosts = (pData ?? []).filter((p: any) =>
        `${p.title ?? ''} ${p.content ?? ''}`.toLowerCase().includes(pn)
      )
      const matchedComments = (cData ?? []).filter((c: any) =>
        `${c.content ?? ''}`.toLowerCase().includes(pn)
      )

      setPosts(matchedPosts as PostRow[])
      setComments(matchedComments as CommentRow[])
    } catch (e: any) {
      setErr(e?.message ?? '분석 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">이 사람 어때? (AI 요약)</h1>
            <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">← 메인</Link>
          </div>
          <p className="text-zinc-400 text-sm">
            게시글/댓글에 쌓인 언급을 기반으로 스타일을 요약합니다. (데이터가 적으면 정확도가 낮아요)
          </p>
        </header>

        <section className="bg-zinc-900 rounded-xl p-4 space-y-3">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="닉네임(예: 징벌 / TimeLeap / 나눔 …)"
              className="flex-1 rounded-lg px-3 py-2 bg-zinc-950 border border-zinc-800 outline-none"
            />
            <button
              onClick={run}
              className="rounded-lg px-4 py-2 bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? '분석중...' : '분석'}
            </button>
          </div>

          {err ? <div className="text-red-300 text-sm">에러: {err}</div> : null}

          {result ? (
            <div className="space-y-4">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <div className="text-lg font-semibold">{name} 요약</div>
                <div className="text-sm text-zinc-300 mt-2">
                  표본: <b>{result.samples}</b>건 · 신뢰도: <b>{result.confidence}</b> · 분위기: <b>{result.tone}</b>
                  <span className="text-zinc-500"> (긍:{result.pos} / 부:{result.neg})</span>
                </div>
                <div className="text-sm text-zinc-400 mt-2">
                  언급 횟수(대략): {result.mentionTotal}회
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="font-semibold mb-2">자주 언급된 게시판</div>
                  {result.topBoards.length === 0 ? (
                    <div className="text-sm text-zinc-400">아직 데이터가 부족해요.</div>
                  ) : (
                    <div className="space-y-2">
                      {result.topBoards.map(([b, c]) => (
                        <div key={b} className="flex justify-between">
                          <span>{b}</span><span className="text-zinc-400">{c}건</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="font-semibold mb-2">스타일 키워드(추정)</div>
                  {result.topTags.length === 0 ? (
                    <div className="text-sm text-zinc-400">아직 특징을 뽑기엔 부족해요.</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {result.topTags.map(([t, c]) => (
                        <span key={t} className="px-3 py-1 rounded-full bg-zinc-800 text-sm">
                          {t} <span className="text-zinc-400">({c})</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-zinc-900 rounded-xl p-4 text-xs text-zinc-500">
                ※ 다음 고급화: “닉네임 고정 프로필(/u/닉네임)”, “최근 7일만 보기”, “게시글/댓글 가중치”, “유저별 언급 그래프” 가능
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}
