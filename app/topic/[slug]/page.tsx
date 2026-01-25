import { redirect } from 'next/navigation'

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v)
  } catch {
    return v
  }
}

export default function TopicSlugPage({
  params,
}: {
  params: { slug: string }
}) {
  const slug = safeDecode(params.slug ?? '').trim()
  if (!slug) redirect('/trend')

  // ✅ 표준 페이지로 통일
  redirect(`/topic/keyword/${encodeURIComponent(slug)}`)
}
