import { supabase } from "@/lib/supabase"
import { fmtDate, fmtTime, getAdminTZ } from "@/lib/date"
import { revalidatePath } from "next/cache"
import ImagePreviewButton from "@/components/ImagePreviewButton"
import PostViewModal from "@/components/PostViewModal"
import SendEmailModal from "@/components/SendEmailModal"
import VoiceNotePlayer from "@/components/VoiceNotePlayer"
import Link from "next/link"

export const revalidate = 0

// Keep this in sync with Haven/constants/crisisKeywords.js — same list is
// duplicated in api/admin-alert/route.ts and dailies/page.tsx since the two
// repos can't share an import.
const CRISIS_KEYWORDS = [
  "suicide", "suicidal",
  "kill myself", "killing myself", "killed myself", "kms",
  "end my life", "ending my life", "end it all",
  "want to die", "wanna die", "wanted to die",
  "don't want to be here", "dont want to be here",
  "don't want to live", "dont want to live",
  "no reason to live", "nothing to live for",
  "not worth living", "not worth it anymore",
  "better off dead", "better off without me",
  "can't go on", "cant go on", "can't do this anymore", "cant do this anymore",
  "self harm", "self-harm", "selfharm",
  "cut myself", "cutting myself", "cutting again", "i cut",
  "hurt myself", "hurting myself", "hurt my self",
  "overdose", "od'd", "od on", "take my own life",
  "give up on life", "giving up on life",
  "goodbye forever", "final goodbye",
  "no one would miss me", "nobody would miss me",
  "i'm done with life", "im done with life",
  "i hate myself so much",
  "i want to disappear forever",
]

function isCrisis(post: any): boolean {
  const text = [post.content, post.headline].filter(Boolean).join(" ").toLowerCase()
  return CRISIS_KEYWORDS.some(kw => text.includes(kw))
}

const FILTERS = [
  { label: "All",          value: "all" },
  { label: "Public",       value: "public" },
  { label: "Friends Only", value: "friends" },
  { label: "Anonymous",    value: "anonymous" },
  { label: "Voice Notes",  value: "voice" },
  { label: "⚠️ Crisis",    value: "crisis" },
]

async function deletePost(id: string) {
  "use server"
  const { data: post } = await supabase.from("posts").select("image_url, voice_url").eq("id", id).single()
  if (post?.image_url) {
    const extractUrls = (raw: string) => {
      try { const p = JSON.parse(raw); if (Array.isArray(p)) return p.filter((u: string) => u.startsWith("http")) } catch {}
      return raw.startsWith("http") ? [raw] : []
    }
    await Promise.all(extractUrls(post.image_url).map(async (url: string) => {
      const marker = "/storage/v1/object/public/Posts/"
      const idx = url.indexOf(marker)
      if (idx !== -1) await supabase.storage.from("Posts").remove([url.slice(idx + marker.length).split("?")[0]])
    }))
  }
  if (post?.voice_url) {
    const marker = "/object/public/voice-notes/"
    const idx = post.voice_url.indexOf(marker)
    if (idx !== -1) await supabase.storage.from("voice-notes").remove([post.voice_url.slice(idx + marker.length).split("?")[0]])
  }
  await supabase.from("posts").delete().eq("id", id)
  revalidatePath("/posts")
}

async function removeVoice(id: string, voiceUrl: string) {
  "use server"
  const marker = "/object/public/voice-notes/"
  const idx = voiceUrl.indexOf(marker)
  if (idx !== -1) await supabase.storage.from("voice-notes").remove([voiceUrl.slice(idx + marker.length).split("?")[0]])
  await supabase.from("posts").update({ voice_url: null }).eq("id", id)
  revalidatePath("/posts")
}

const parseImageUrls = (raw: string | null): string[] => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((u: unknown) => typeof u === "string" && (u as string).startsWith("http"))
    if ((parsed as any)?._type === "text-card") return []
  } catch {}
  return raw.startsWith("http") ? [raw] : []
}

type TextCard = { text: string; bg: string; textColor: string; fontFamily: string; fontStyle: string; fontWeight: string; fontSize: number }
const parseTextCard = (raw: string | null): TextCard | null => {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed?._type === "text-card") return parsed as TextCard
  } catch {}
  return null
}

async function signPostImageUrls(rawPosts: any[]): Promise<Map<string, string>> {
  // Collect every unique storage path across all posts
  const pathToUrl = new Map<string, string>()
  for (const p of rawPosts) {
    for (const url of parseImageUrls(p.image_url)) {
      const m = url.match(/\/object\/(?:public|sign)\/Posts\/(.+?)(?:\?|$)/)
      if (m) pathToUrl.set(m[1], url)
    }
  }
  if (!pathToUrl.size) return new Map()

  const paths = Array.from(pathToUrl.keys())
  const { data } = await supabase.storage.from("Posts").createSignedUrls(paths, 3600)
  const signed = new Map<string, string>()
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) signed.set(item.path, item.signedUrl)
  }
  // Map original URL → signed URL
  const result = new Map<string, string>()
  for (const [path, origUrl] of pathToUrl) {
    result.set(origUrl, signed.get(path) ?? origUrl)
  }
  return result
}

export default async function Posts({ searchParams }: { searchParams: { filter?: string } }) {
  const tz = await getAdminTZ()
  const filter = FILTERS.find(f => f.value === searchParams.filter)?.value ?? "all"

  let query = supabase
    .from("posts")
    .select("id, content, image_url, headline, is_anonymous, category, created_at, user_id, voice_url, visibility, profiles(username, email)")
    .order("created_at", { ascending: false })
    .limit(100)

  if (filter === "public")    query = query.eq("is_anonymous", false).eq("visibility", "public")
  if (filter === "friends")   query = query.eq("visibility", "friends")
  if (filter === "anonymous") query = query.eq("is_anonymous", true)
  if (filter === "voice")     query = query.not("voice_url", "is", null)
  // Crisis: fetch all anon posts, filter by keyword in JS
  if (filter === "crisis")    query = query.eq("is_anonymous", true).limit(500)

  const [{ data: rawPosts }, { count: totalCount }, { count: anonCount }, { count: publicCount }, { count: friendsCount }, { count: voiceCount }, { data: allAnonForCrisis }] = await Promise.all([
    query,
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_anonymous", true),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_anonymous", false).eq("visibility", "public"),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("visibility", "friends"),
    supabase.from("posts").select("id", { count: "exact", head: true }).not("voice_url", "is", null),
    supabase.from("posts").select("id, content, headline").eq("is_anonymous", true).limit(500),
  ])

  const crisisCount = (allAnonForCrisis ?? []).filter(isCrisis).length

  let posts = rawPosts ?? []
  if (filter === "crisis") posts = posts.filter(isCrisis)

  const signedUrlMap = await signPostImageUrls(posts)

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Posts</h2>
      <p className="text-gray-500 text-sm mb-4">
        {totalCount ?? 0} total · {publicCount ?? 0} public · {friendsCount ?? 0} friends-only · {anonCount ?? 0} anonymous · {voiceCount ?? 0} voice notes
      </p>

      {crisisCount > 0 && filter !== "crisis" && (
        <Link href="/posts?filter=crisis" className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/40 hover:bg-red-500/15 transition">
          <span className="text-xl">🚨</span>
          <div>
            <p className="text-red-400 font-bold text-sm">{crisisCount} anonymous post{crisisCount !== 1 ? "s" : ""} flagged for crisis language</p>
            <p className="text-red-400/60 text-xs">Click to review and reach out to these users</p>
          </div>
          <span className="ml-auto text-red-400/60 text-xs font-bold">View →</span>
        </Link>
      )}

      {filter === "crisis" && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/40">
          <span className="text-xl">🚨</span>
          <div>
            <p className="text-red-400 font-bold text-sm">Crisis posts — reach out to these users</p>
            <p className="text-red-400/60 text-xs">These anonymous posts contain self-harm or crisis language. Use the email button to reach out with care.</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map(f => (
          <Link
            key={f.value}
            href={`/posts?filter=${f.value}`}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
              filter === f.value
                ? f.value === "crisis" ? "bg-red-500 text-white" : "bg-[#e378ac] text-white"
                : f.value === "crisis"
                  ? crisisCount > 0
                    ? "bg-red-500/10 text-red-400 border border-red-500/40 hover:bg-red-500/15"
                    : "bg-[#1a1a1a] text-gray-500 border border-[#2a2a2a]"
                  : "bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2a2a2a]"
            }`}
          >
            {f.label}{f.value === "crisis" && crisisCount > 0 ? ` (${crisisCount})` : ""}
          </Link>
        ))}
      </div>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide">
              <th className="text-left px-6 py-4">Author</th>
              <th className="text-left px-6 py-4">Content</th>
              <th className="text-left px-6 py-4">Media</th>
              <th className="text-left px-6 py-4">Type</th>
              <th className="text-left px-6 py-4">Date</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p, i) => {
              const imageUrls = parseImageUrls(p.image_url).map(u => signedUrlMap.get(u) ?? u)
              const tc = parseTextCard(p.image_url)
              const hasVoice = !!(p as any).voice_url
              const isFriends = (p as any).visibility === "friends"
              const flagged = isCrisis(p)
              const crisisEmail = `Hi @${(p.profiles as any)?.username ?? "there"},\n\nWe noticed something you shared on Haven and we wanted to check in on you.\n\nYou're not alone, and we care about how you're doing. If you're going through a hard time right now, please know that support is available:\n\n• Crisis Text Line: Text HOME to 741741\n• National Suicide Prevention Lifeline: 988 (call or text)\n• International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/\n\nWe're here for you. Haven is a safe space, and so are we.\n\nWith care,\nThe Haven Team`
              return (
                <tr key={p.id} className={`border-b ${flagged ? "border-red-900/40 bg-red-500/5" : `border-[#1f1f1f] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}`}>
                  <td className="px-6 py-4 text-gray-400">
                    {flagged && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold mb-1.5 border border-red-500/30">
                        🚨 crisis
                      </span>
                    )}
                    <Link href={`/users/${p.user_id}`} className="hover:opacity-80 transition block">
                      {p.is_anonymous ? (
                        <div>
                          <span className="text-purple-400 italic block">anonymous</span>
                          <span className="text-gray-600 text-xs">@{(p.profiles as any)?.username}</span>
                        </div>
                      ) : (
                        <span className="text-[#e378ac] font-semibold">@{(p.profiles as any)?.username}</span>
                      )}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-300 max-w-xs">
                    {p.headline && (
                      <p className="text-white font-semibold text-xs mb-0.5 truncate">{p.headline}</p>
                    )}
                    {tc ? (
                      <p className="truncate text-indigo-300 italic">&ldquo;{tc.text}&rdquo;</p>
                    ) : (
                      <p className="truncate">{p.content || <span className="text-gray-600 italic">no text</span>}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {hasVoice ? (
                      <VoiceNotePlayer url={(p as any).voice_url} />
                    ) : tc ? (
                      <div
                        style={{ backgroundColor: tc.bg, color: tc.textColor, fontFamily: tc.fontFamily, fontStyle: tc.fontStyle as any, fontWeight: tc.fontWeight as any }}
                        className="w-14 h-14 rounded-xl flex items-center justify-center p-1.5 text-center overflow-hidden text-[9px] leading-tight shrink-0"
                      >
                        {tc.text}
                      </div>
                    ) : (
                      <ImagePreviewButton urls={imageUrls} />
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold w-fit ${
                        p.is_anonymous
                          ? "bg-purple-400/10 text-purple-400"
                          : isFriends
                          ? "bg-rose-400/10 text-rose-300"
                          : "bg-[#e378ac]/10 text-[#e378ac]"
                      }`}>
                        {p.is_anonymous ? "anon" : isFriends ? "friends" : "public"}
                      </span>
                      {hasVoice && (
                        <span className="text-xs px-2 py-1 rounded-full font-semibold w-fit bg-[#e378ac]/10 text-[#e378ac]">
                          voice
                        </span>
                      )}
                      {tc && (
                        <span className="text-xs px-2 py-1 rounded-full font-semibold w-fit bg-indigo-400/10 text-indigo-400">
                          text card
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    <div>{fmtDate(p.created_at, tz)}</div>
                    <div className="text-gray-600 text-xs mt-0.5">{fmtTime(p.created_at, tz)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 justify-end">
                      <PostViewModal
                        username={(p.profiles as any)?.username ?? null}
                        isAnonymous={p.is_anonymous}
                        headline={(p as any).headline ?? null}
                        content={p.content ?? null}
                        imageUrl={p.image_url ?? null}
                        createdAt={p.created_at}
                        category={p.category ?? null}
                      />
                      <SendEmailModal
                        to={(p.profiles as any)?.email}
                        username={(p.profiles as any)?.username ?? "user"}
                        defaultSubject={flagged ? "We're here for you 💙" : "Your post on Haven"}
                        defaultBody={flagged ? crisisEmail : `Hi @${(p.profiles as any)?.username ?? "there"},\n\nWe're reaching out about a post you made on Haven${p.content ? `:\n\n"${p.content.slice(0, 150)}${p.content.length > 150 ? "…" : ""}"` : "."}\n\n[Let them know what's wrong with the post here]\n\nPlease review Haven's Community Guidelines to avoid further action on your account.\n\nThe Haven Team`}
                      />
                      {hasVoice && (
                        <form action={removeVoice.bind(null, p.id, (p as any).voice_url)}>
                          <button type="submit" className="text-yellow-500/60 hover:text-yellow-400 text-xs font-bold transition whitespace-nowrap">
                            Remove audio
                          </button>
                        </form>
                      )}
                      <form action={deletePost.bind(null, p.id)}>
                        <button className="text-red-400/50 hover:text-red-400 text-xs font-bold transition">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
