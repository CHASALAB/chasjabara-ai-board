'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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
    texts.push(`${p.title ?? ''} ${p.content ?? ''}`)
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
  const topTags = [...tagCount.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 6)

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

function cut(s: string, n = 90) {
  const t = (s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}

export default function AnalyzePage() {
  const sp = useSearchParams()

  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [comments, setComments] = useState<CommentRow[]>([])
  const [err, setErr] = useState<string | null>(null)

  // ✅ 근거 링크용 (댓글은 부모 글로 연결)
  const [postById, setPostById] = useState<Map<string, PostRow>>(new Map())

  const result = useMemo(() => {
    const n = name.trim()
    if (!n) return null
    return summarize(posts, comments, n)
  }, [posts, comments, name])

  const evidence = useMemo(() => {
    // 최근 근거 8개(게시글 5 + 댓글 3 정도 느낌)
    const postE = posts
      .slice()
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .slice(0, 6)
      .map((p) => ({
        type: 'post' as const,
        id: p.id,
        board: p.board ?? '기타',
        title: p.title ?? '(제목 없음)',
        snippet: cut(`${p.title ?? ''} ${p.content ?? ''}`, 110),
        created_at: p.created_at ?? '',
      }))

    const commentE = comments
      .slice()
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .slice(0, 6)
      .map((c) => {
        const parent = postById.get(c.post_id)
        return {
          type: 'comment' as const,
          id: c.id,
          post_id: c.post_id,
          board: parent?.board ?? '기타',
          title: parent?.title ?? '(원글 제목 없음)',
          snippet: cut(c.content ?? '', 110),
          created_at: c.created_at ?? '',
        }
      })

    // 섞어서 최신순으로 10개
    const all = [...postE, ...commentE].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')).slice(0, 10)
    return all
  }, [posts, comments, postById])

  async function run(targetName?: string) {
    const n = (targetName ?? name).trim()
    if (!n) return alert('닉네임(또는 별칭)을 입력해줘!')

    setLoading(true)
    setErr(null)
    try {
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      const pn = n.toLowerCase()

      // 1) 최근 게시글 가져오기
      const { data: pData, error: pErr } = await supabase
        .from('posts')
        .select('id, board, title, content, author, created_at')
        .gte('created_at', since)
        .eq('hidden', false)
        .order('created_at', { ascending: false })
        .limit(600)

      if (pErr) throw pErr

      // 2) 최근 댓글 가져오기
      const { data: cData, error: cErr } = await supabase
        .from('comments')
        .select('id, post_id, content, author, created_at')
        .gte('created_at', since)
        .eq('hidden', false)
        .order('created_at', { ascending: false })
        .limit(900)

      if (cErr) throw cErr

      const allPosts = (pData ?? []) as PostRow[]
      const allComments = (cData ?? []) as CommentRow[]

      // 3) 이름이 들어간 것만 필터
      const matchedPosts = allPosts.filter((p) =>
        `${p.title ?? ''} ${p.content ?? ''}`.toLowerCase().includes(pn)
      )
      const matchedComments = allComments.filter((c) =>
        `${c.content ?? ''}`.toLowerCase().includes(pn)
      )

      // 4) 댓글 근거 링크를 위해 post_id -> postRow 맵 만들기
      const map = new Map<string, PostRow>()
      for (const p of allPosts) map.set(p.id, p)
      setPostById(map)

      setPosts(matchedPosts)
      setComments(matchedComments)
      setName(n)
    } catch (e: any) {
      setErr(e?.message ?? '분석 실패')
    } finally {
      setLoading(false)
    }
  }

  // ✅ /analyze?name=xxx 로 들어오면 자동 입력 + 자동 분석
  useEffect(() => {
    const q = sp.get('name')?.trim()
    if (q) {
      setName(q)
      run(q)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">이 사람 어때? (AI 요약)</h1>
            <div className="flex gap-3">
              <Link href="/trend" className="text-sm text-zinc-400 hover:text-zinc-200">트렌드</Link>
              <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">메인</Link>
            </div>
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
              onClick={() => run()}
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

              {/* ✅ 근거 링크 */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">근거(최근 언급 링크)</div>
                  <div className="text-xs text-zinc-500">최대 10개</div>
                </div>

                {evidence.length === 0 ? (
                  <div className="text-sm text-zinc-400">아직 근거가 부족해요. 언급이 더 쌓이면 자동으로 보여요.</div>
                ) : (
                  <div className="space-y-2">
                    {evidence.map((e) => {
                      const boardSlug = encodeURIComponent(e.board ?? '기타')
                      const href = e.type === 'post'
                        ? `/board/${boardSlug}/post/${e.id}`
                        : `/board/${boardSlug}/post/${e.post_id}`

                      return (
                        <Link
                          key={`${e.type}-${e.id}`}
                          href={href}
                          className="block bg-zinc-950 border border-zinc-800 rounded-xl p-3 hover:bg-zinc-900"
                        >
                          <div className="text-xs text-zinc-500">
                            {e.type === 'post' ? '게시글' : '댓글'} · {e.board} · {e.created_at ? new Date(e.created_at).toLocaleString() : ''}
                          </div>
                          <div className="mt-1 font-semibold text-sm">{e.title}</div>
                          <div className="mt-1 text-sm text-zinc-300">{e.snippet}</div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="bg-zinc-900 rounded-xl p-4 text-xs text-zinc-500">
                ※ 다음 고급화: "유저 프로필(/u/닉네임)", "최근 7일/30일 필터", "가중치(글&gt;댓글)", "트렌드 그래프" 가능

              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}

