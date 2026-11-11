import { supabase } from "@/lib/supabase"
import { fmtDate, fmtTime, getAdminTZ } from "@/lib/date"
import { deleteStory, parseStoryContent, signPostsUrls } from "@/lib/stories"
import { revalidatePath } from "next/cache"
import Image from "next/image"
import Link from "next/link"

export const revalidate = 0

// Keep this in sync with Haven/constants/crisisKeywords.js — same list is
// duplicated in posts/page.tsx and api/admin-alert/route.ts since the two
// repos can't share an import.
const CRISIS_KEYWORDS = [
  "suicide", "suicidal",
  "kill myself", "killing myself", "killed myself", "kms",
  "end my life", "ending my life", "end it all", "take my life",
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

function hasCrisis(text: string): boolean {
  const lower = text.toLowerCase()
  return CRISIS_KEYWORDS.some(kw => lower.includes(kw))
}

const PAGE_SIZE = 50

const asUtc = (s: string) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`)

function timeLeft(expiresAt: string | null): string | null {
  if (!expiresAt) return null
  const mins = Math.floor((asUtc(expiresAt).getTime() - Date.now()) / 60000)
  if (mins <= 0) return null
  if (mins < 60) return `${mins}m left`
  return `${Math.floor(mins / 60)}h ${mins % 60}m left`
}

function firstImage(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const p = JSON.parse(raw)
    if (Array.isArray(p)) return p.find((u: unknown) => typeof u === "string" && (u as string).startsWith("http")) ?? null
  } catch {}
  return raw.startsWith("http") ? raw : null
}

async function removeStory(id: string) {
  "use server"
  await deleteStory(id)
  revalidatePath("/dailies")
}

export default async function StoriesPage({ searchParams }: { searchParams: { view?: string; page?: string } }) {
  const tz = await getAdminTZ()
  const view = searchParams.view === "all" ? "all" : "live"
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1)
  const now = new Date().toISOString()

  let query = supabase
    .from("daily_posts")
    .select(`
      id, content, image_url, created_at, expires_at, user_id, shared_post_id,
      profiles:user_id(username, display_name, avatar_url),
      shared_post:shared_post_id(content, image_url, profiles:user_id(username))
    `)
    .order("created_at", { ascending: false })
  if (view === "live") query = query.gt("expires_at", now)
  else query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  const [{ data: stories }, { count: liveCount }, { count: totalCount }, { count: chapterCount }] = await Promise.all([
    query,
    supabase.from("daily_posts").select("id", { count: "exact", head: true }).gt("expires_at", now),
    supabase.from("daily_posts").select("id", { count: "exact", head: true }),
    supabase.from("story_highlights").select("id", { count: "exact", head: true }),
  ])

  const rows = stories ?? []
  const ids = rows.map(r => r.id)

  // Which chapters each story is in (chapters are public on the profile).
  const { data: chapterLinks } = ids.length
    ? await supabase.from("story_highlight_items").select("daily_post_id, story_highlights(title)").in("daily_post_id", ids)
    : { data: [] as any[] }
  const chaptersByStory = new Map<string, string[]>()
  for (const l of chapterLinks ?? []) {
    const title = (l as any).story_highlights?.title
    if (!title) continue
    chaptersByStory.set(l.daily_post_id, [...(chaptersByStory.get(l.daily_post_id) ?? []), title])
  }

  const signed = await signPostsUrls(rows.flatMap(r => [r.image_url, firstImage((r as any).shared_post?.image_url)]))
  const crisisCount = rows.filter(d => hasCrisis(parseStoryContent(d.content).text)).length
  const totalPages = view === "all" ? Math.max(1, Math.ceil((totalCount ?? 0) / PAGE_SIZE)) : 1

  const tab = (v: "live" | "all", label: string) => (
    <Link
      href={`/dailies?view=${v}`}
      className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
        view === v ? "bg-[#e378ac] text-white" : "bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2a2a2a]"
      }`}
    >
      {label}
    </Link>
  )

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-black text-white mb-1">Stories</h2>
          <p className="text-gray-500 text-sm">
            {liveCount ?? 0} live (last 24h) · {totalCount ?? 0} kept in total · {chapterCount ?? 0} chapters
          </p>
          <p className="text-gray-600 text-xs mt-1">
            Stories are kept forever. After 24h only the owner can see them, unless they&apos;re in one of the owner&apos;s Chapters.
          </p>
        </div>
        {crisisCount > 0 && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5">
            <span className="text-red-400 text-sm font-bold">⚠️ {crisisCount} crisis {crisisCount === 1 ? "flag" : "flags"}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-5">
        {tab("live", `Live (${liveCount ?? 0})`)}
        {tab("all", `All (${totalCount ?? 0})`)}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-20 text-gray-600 text-sm">
          {view === "live" ? "No live stories right now." : "No stories yet."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map(story => {
            const { text, feeling, emoji, isUpdate } = parseStoryContent(story.content)
            const isCrisis = hasCrisis(text)
            const profile = Array.isArray(story.profiles) ? (story.profiles as any[])[0] : story.profiles as any
            const displayName = profile?.display_name || profile?.username || "unknown"
            const username = profile?.username
            const shared = (story as any).shared_post as any
            const isRepost = !!story.shared_post_id
            const photo = story.image_url ? signed.get(story.image_url) ?? null : null
            const sharedImg = firstImage(shared?.image_url)
            const sharedPhoto = sharedImg ? signed.get(sharedImg) ?? sharedImg : null
            const left = timeLeft(story.expires_at)
            const chapters = chaptersByStory.get(story.id) ?? []

            return (
              <div
                key={story.id}
                className={`bg-[#1a1a1a] rounded-2xl p-5 border transition ${
                  isCrisis ? "border-red-500/50 bg-red-500/5" : "border-[#2a2a2a]"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {profile?.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={displayName}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover border-2 border-[#e378ac]"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#e378ac]/20 border-2 border-[#e378ac] flex items-center justify-center text-[#e378ac] font-black text-sm">
                        {displayName[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Link href={`/users/${story.user_id}`} className="text-white font-bold text-sm hover:opacity-80">{displayName}</Link>
                      {username && <span className="text-gray-500 text-xs">@{username}</span>}
                      {isUpdate && (
                        <span className="bg-[#e378ac] text-white text-[10px] font-black px-2 py-0.5 rounded-full tracking-wide">UPDATE</span>
                      )}
                      {isRepost && (
                        <span className="bg-sky-400/10 text-sky-300 text-[10px] font-black px-2 py-0.5 rounded-full tracking-wide border border-sky-400/20">REPOST</span>
                      )}
                      {chapters.map(c => (
                        <span key={c} className="bg-amber-400/10 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400/20" title="Public on their profile">
                          📖 {c}
                        </span>
                      ))}
                      {isCrisis && (
                        <span className="bg-red-500/20 text-red-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-500/40 tracking-wide">
                          ⚠️ CRISIS
                        </span>
                      )}
                    </div>

                    {text ? (
                      <p className={`text-sm leading-relaxed mb-2 ${isCrisis ? "text-red-300" : "text-gray-200"}`}>{text}</p>
                    ) : null}

                    {isUpdate && (feeling || emoji) && (
                      <p className="text-xs text-gray-400 mb-2">
                        <span className="text-[#e378ac] font-bold uppercase tracking-wider text-[10px]">Feeling: </span>
                        {feeling}{emoji ? ` ${emoji}` : ""}
                      </p>
                    )}

                    {isRepost && (
                      <div className="mt-1 mb-2 flex items-start gap-3 bg-black/30 border border-[#2a2a2a] rounded-xl p-3 max-w-md">
                        {sharedPhoto && (
                          <Image src={sharedPhoto} alt="reposted post" width={56} height={56} className="w-14 h-14 rounded-lg object-cover" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500 mb-0.5">
                            {shared ? `Reposted @${shared.profiles?.username ?? "user"}'s post` : "Reposted post (since deleted)"}
                          </p>
                          {shared?.content && <p className="text-sm text-gray-300 line-clamp-2">{shared.content}</p>}
                        </div>
                      </div>
                    )}

                    {photo && (
                      <a href={photo} target="_blank" rel="noopener noreferrer" className="block mt-2 mb-2">
                        <Image
                          src={photo}
                          alt="story photo"
                          width={320}
                          height={288}
                          className="max-h-72 max-w-xs rounded-2xl object-cover border border-[#2a2a2a] hover:opacity-90 transition"
                          style={{ width: "auto", height: "auto", maxHeight: "18rem", maxWidth: "20rem" }}
                        />
                      </a>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-gray-600 mt-1">
                      <span>{fmtDate(story.created_at, tz)} · {fmtTime(story.created_at, tz)}</span>
                      <span className="text-gray-700">·</span>
                      <span>{left ?? (chapters.length ? "expired · public in a chapter" : "expired · archive (owner only)")}</span>
                    </div>
                  </div>

                  <form action={removeStory.bind(null, story.id)}>
                    <button
                      type="submit"
                      title={chapters.length ? `Also removes it from: ${chapters.join(", ")}` : "Deletes the story and its photo"}
                      className="text-xs text-gray-600 hover:text-red-400 transition px-3 py-1.5 rounded-lg hover:bg-red-400/10 border border-transparent hover:border-red-400/20 whitespace-nowrap"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view === "all" && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6 text-sm">
          {page > 1 ? (
            <Link href={`/dailies?view=all&page=${page - 1}`} className="px-4 py-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 hover:text-white">← Newer</Link>
          ) : <span className="px-4 py-2 text-gray-700">← Newer</span>}
          <span className="text-gray-500">Page {page} of {totalPages}</span>
          {page < totalPages ? (
            <Link href={`/dailies?view=all&page=${page + 1}`} className="px-4 py-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 hover:text-white">Older →</Link>
          ) : <span className="px-4 py-2 text-gray-700">Older →</span>}
        </div>
      )}
    </div>
  )
}
