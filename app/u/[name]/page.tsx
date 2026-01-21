'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
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

function safeDecode(v: string) {
  try { return decodeURIComponent(v) } catch { return v }
}
function cut(s: string, n = 100) {
  const t = (s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n) + '…' : t
}
function countMentions(text: string, q: string) {
  if (!text) return 0
  const t = text.toLowerCase()
  const qq = q.toLowerCase().trim()
  if (!qq) return 0
  let idx = 0, cnt = 0
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
  const tagCount = new Map<string, number>()
  let pos = 0
  let neg = 0
  let mentionTotal = 0

  const texts: string[] = []
  for (const p of posts) {
    const b = (p.board ?? '기타').toString()
    boardCount.set(b, (boardCount.get(b) ?? 0) + 1)
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

  const topBoards = [...boardCount.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 6)
  const topTags = [...tagCount.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 8)

  return { samples, confidence, tone, pos, neg, mentionTotal, topBoards, topTags }
}

export default function UserProfilePage() {
  const params = useParams()
  const rawName = (params?.name ?? '') as string
  const name = useMemo(() => safeDecode(rawName).trim(), [rawName])
  const nameSlug = useMemo(() => encodeURIComponent(name), [name])

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [comments, setComments] = useState<CommentRow[]>([])
  const [postById, setPostById] = useState<Map<string, PostRow>>(new Map())

  const summary = useMemo(() => summarize(posts, comments, name), [posts, comments, name])

  const evidence = useMemo(() => {
    const postE = posts
      .slice()
      .sort((a,b)=> (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .slice(0, 6)
      .map((p) => ({
        type: 'post' as const,
        id: p.id,
        board: p.board ?? '기타',
        title: p.title ?? '(제목 없음)',
        snippet: cut(`${p.title ?? ''} ${p.content ?? ''}`, 120),
        created_at: p.created_at ?? '',
      }))

    const commentE = comments
      .slice()
      .sort((a,b)=> (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .slice(0, 6)
      .map((c) => {
        const parent = postById.get(c.post_id)
        return {
          type: 'comment' as const,
          id: c.id,
          post_id: c.post_id,
          board: parent?.board ?? '기타',
          title: parent?.title ?? '(원글 제목 없음)',
          snippet: cut(c.content ?? '', 120),
          created_at: c.created_at ?? '',
        }
      })

    return [...postE, ...commentE]
      .sort((a,b)=> (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .slice(0, 10)
  }, [posts, comments, postById])

  useEffect(() => {
    const run = async () => {
      if (!name) {
        setLoading(false)
        return
      }
      setLoading(true)
      setErr(null)
      try {
        const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
        const pn = name.toLowerCase()

        const { data: pData, error: pErr } = await supabase
          .from('posts')
          .select('id, board, title, content, author, created_at')
          .gte('created_at', since)
          .eq('hidden', false)
          .order('created_at', { ascending: false })
          .limit(800)

        if (pErr) throw pErr

        const { data: cData, error: cErr } = await supabase
          .from('comments')
          .select('id, post_id, content, author, created_at')
          .gte('created_at', since)
          .eq('hidden', false)
          .order('created_at', { ascending: false })
          .limit(1200)

        if (cErr) throw cErr

        const allPosts = (pData ?? []) as PostRow[]
        const allComments = (cData ?? []) as CommentRow[]

        const map = new Map<string, PostRow>()
        for (const p of allPosts) map.set(p.id, p)
        setPostById(map)

        setPosts(allPosts.filter((p) => `${p.title ?? ''} ${p.content ?? ''}`.toLowerCase().includes(pn)))
        setComments(allComments.filter((c) => `${c.content ?? ''}`.toLowerCase().includes(pn)))
      } catch (e: any) {
        setErr(e?.message ?? '프로필 불러오기 실패')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [name])

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-5 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">유저 프로필</h1>
            <div className="flex gap-3">
              <Link href="/trend" className="text-sm text-zinc-400 hover:text-zinc-200">트렌드</Link>
              <Link href="/analyze" className="text-sm text-zinc-400 hover:text-zinc-200">분석</Link>
              <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">메인</Link>
            </div>
          </div>
          <div className="text-zinc-300">
            닉네임: <b className="text-white">{name || '(없음)'}</b>
          </div>
          <div className="text-xs text-zinc-500">
            공유 링크: /u/{nameSlug}
          </div>
        </header>

        {loading ? (
          <section className="bg-zinc-900 rounded-xl p-4 text-zinc-300">불러오는 중...</section>
        ) : err ? (
          <section className="bg-zinc-900 rounded-xl p-4 text-red-300">에러: {err}</section>
        ) : (
          <>
            <section className="bg-zinc-900 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xl font-semibold">{name} 요약</div>
                <Link
                  href={`/analyze?name=${encodeURIComponent(name)}`}
                  className="text-sm text-zinc-300 hover:text-white"
                >
                  자세히(분석) →
                </Link>
              </div>

              <div className="text-sm text-zinc-300">
                표본: <b>{summary.samples}</b> · 신뢰도: <b>{summary.confidence}</b> · 분위기: <b>{summary.tone}</b>
                <span className="text-zinc-500"> (긍:{summary.pos} / 부:{summary.neg})</span>
              </div>

              <div className="text-sm text-zinc-400">
                언급 횟수(대략): {summary.mentionTotal}회
              </div>

              <div className="grid md:grid-cols-2 gap-4 pt-2">
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                  <div className="font-semibold mb-2">자주 언급된 게시판</div>
                  {summary.topBoards.length === 0 ? (
                    <div className="text-sm text-zinc-400">데이터 부족</div>
                  ) : (
                    <div className="space-y-2">
                      {summary.topBoards.map(([b, c]) => (
                        <div key={b} className="flex justify-between">
                          <span>{b}</span><span className="text-zinc-400">{c}건</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                  <div className="font-semibold mb-2">스타일 키워드(추정)</div>
                  {summary.topTags.length === 0 ? (
                    <div className="text-sm text-zinc-400">데이터 부족</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {summary.topTags.map(([t, c]) => (
                        <span key={t} className="px-3 py-1 rounded-full bg-zinc-800 text-sm">
                          {t} <span className="text-zinc-400">({c})</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">근거(최근 언급 링크)</div>
                <div className="text-xs text-zinc-500">최대 10개</div>
              </div>

              {evidence.length === 0 ? (
                <div className="text-sm text-zinc-400">근거가 아직 없어요. 언급이 더 쌓이면 자동으로 보여요.</div>
              ) : (
                <div className="space-y-2">
                  {evidence.map((e) => {
                    const boardSlug = encodeURIComponent(e.board ?? '기타')
                    const href = e.type === 'post'
                      ? `/board/${boardSlug}/post/${e.id}`
                      : `/board/${boardSlug}/post/${(e as any).post_id}`

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
            </section>
          </>
        )}
      </div>
    </main>
  )
}
