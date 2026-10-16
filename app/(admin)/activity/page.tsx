import { supabase } from "@/lib/supabase"
import { fmtDateTime, getAdminTZ } from "@/lib/date"
import Link from "next/link"

export const revalidate = 0

const PER_TYPE_LIMIT = 30
const DISPLAY_LIMIT = 60

type Profile = { id: string; username: string; display_name: string | null; avatar_url: string | null }

type ActivityEvent = {
  id: string
  type: "like" | "post" | "follow" | "app_open"
  at: string
  actor: Profile | null
  target?: Profile | null
  extra?: string | null
}

export default async function ActivityPage() {
  const tz = await getAdminTZ()

  const [{ data: likes }, { data: posts }, { data: follows }, { data: recentlySeen }] = await Promise.all([
    supabase.from("likes").select("id, user_id, post_id, created_at").order("created_at", { ascending: false }).limit(PER_TYPE_LIMIT),
    supabase.from("posts").select("id, user_id, created_at, content, headline").order("created_at", { ascending: false }).limit(PER_TYPE_LIMIT),
    supabase.from("follows").select("id, follower_id, following_id, created_at").order("created_at", { ascending: false }).limit(PER_TYPE_LIMIT),
    supabase.from("profiles").select("id, username, display_name, avatar_url, last_seen_at").not("last_seen_at", "is", null).order("last_seen_at", { ascending: false }).limit(PER_TYPE_LIMIT),
  ])

  // Resolve the post owner for each liked post, so we can show "@liker liked @owner's post"
  const likedPostIds = [...new Set((likes ?? []).map(l => l.post_id).filter(Boolean))]
  const { data: likedPosts } = likedPostIds.length
    ? await supabase.from("posts").select("id, user_id").in("id", likedPostIds)
    : { data: [] as { id: string; user_id: string }[] }
  const postOwnerByPostId = new Map((likedPosts ?? []).map(p => [p.id, p.user_id]))

  const profileIds = new Set<string>()
  ;(likes ?? []).forEach(l => { profileIds.add(l.user_id); const owner = postOwnerByPostId.get(l.post_id); if (owner) profileIds.add(owner) })
  ;(posts ?? []).forEach(p => profileIds.add(p.user_id))
  ;(follows ?? []).forEach(f => { profileIds.add(f.follower_id); profileIds.add(f.following_id) })
  ;(recentlySeen ?? []).forEach(p => profileIds.add(p.id))

  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", [...profileIds])
  const profileMap = new Map<string, Profile>((profileRows ?? []).map(p => [p.id, p]))

  const events: ActivityEvent[] = [
    ...(likes ?? []).map(l => ({
      id: `like-${l.id}`,
      type: "like" as const,
      at: l.created_at,
      actor: profileMap.get(l.user_id) ?? null,
      target: postOwnerByPostId.has(l.post_id) ? profileMap.get(postOwnerByPostId.get(l.post_id)!) ?? null : null,
    })),
    ...(posts ?? []).map(p => ({
      id: `post-${p.id}`,
      type: "post" as const,
      at: p.created_at,
      actor: profileMap.get(p.user_id) ?? null,
      extra: p.headline || (p.content ? p.content.slice(0, 80) : null),
    })),
    ...(follows ?? []).map(f => ({
      id: `follow-${f.id}`,
      type: "follow" as const,
      at: f.created_at,
      actor: profileMap.get(f.follower_id) ?? null,
      target: profileMap.get(f.following_id) ?? null,
    })),
    ...(recentlySeen ?? []).map(p => ({
      id: `open-${p.id}`,
      type: "app_open" as const,
      at: (p as any).last_seen_at,
      actor: profileMap.get(p.id) ?? null,
    })),
  ]
    .filter(e => e.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, DISPLAY_LIMIT)

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Activity</h2>
      <p className="text-gray-500 text-sm mb-8">
        Recent likes, posts, follows, and app opens — a quick pulse check on who's actually using Haven.
      </p>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
        {events.map((e, i) => (
          <div key={e.id} className={`flex items-center gap-3 px-5 py-3.5 border-b border-[#1f1f1f] last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
            <span className="text-lg w-6 text-center shrink-0">
              {e.type === "like" ? "❤️" : e.type === "post" ? "🌸" : e.type === "follow" ? "➕" : "📱"}
            </span>
            {e.actor?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.actor.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#2a2a2a] shrink-0" />
            )}
            <div className="flex-1 min-w-0 text-sm">
              <ActorLink profile={e.actor} />
              {e.type === "like" && (
                <span className="text-gray-400"> liked {e.target ? <>
                  <ActorLink profile={e.target} /> &rsquo;s post
                </> : "a post"}</span>
              )}
              {e.type === "post" && (
                <span className="text-gray-400"> posted{e.extra ? <span className="text-gray-600 italic"> — &ldquo;{e.extra}{e.extra.length >= 80 ? "…" : ""}&rdquo;</span> : ""}</span>
              )}
              {e.type === "follow" && (
                <span className="text-gray-400"> followed <ActorLink profile={e.target} /></span>
              )}
              {e.type === "app_open" && (
                <span className="text-gray-400"> opened the app</span>
              )}
            </div>
            <span className="text-gray-600 text-xs shrink-0">{fmtDateTime(e.at, tz)}</span>
          </div>
        ))}
        {events.length === 0 && (
          <p className="px-5 py-12 text-center text-gray-600 italic">No recent activity.</p>
        )}
      </div>
    </div>
  )
}

function ActorLink({ profile }: { profile: Profile | null | undefined }) {
  if (!profile) return <span className="text-gray-600 italic">unknown</span>
  return (
    <Link href={`/users/${profile.id}`} className="hover:underline">
      <span className="text-[#e378ac] font-semibold">@{profile.username}</span>
    </Link>
  )
}
