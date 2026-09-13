import { supabase } from "@/lib/supabase"
import { fmtDate, fmtTime, getAdminTZ } from "@/lib/date"
import { revalidatePath } from "next/cache"
import Image from "next/image"

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

function parseContent(raw: string | null): { text: string; feeling: string; emoji: string; isUpdate: boolean } {
  if (!raw) return { text: "", feeling: "", emoji: "", isUpdate: false }
  if (raw.startsWith('{"_type":"update"')) {
    try {
      const p = JSON.parse(raw)
      if (p._type === "update") return { text: p.text || "", feeling: p.feeling || "", emoji: p.emoji || "", isUpdate: true }
    } catch {}
  }
  if (raw.startsWith('{"_l":') || raw.startsWith('{"_layout":')) {
    try {
      const sep = raw.indexOf("}") + 1
      return { text: raw.slice(sep).trim(), feeling: "", emoji: "", isUpdate: false }
    } catch {}
  }
  return { text: raw, feeling: "", emoji: "", isUpdate: false }
}

function timeLeft(expiresAt: string): string {
  const exp = new Date(expiresAt.endsWith("Z") ? expiresAt : expiresAt + "Z")
  const mins = Math.max(0, Math.floor((exp.getTime() - Date.now()) / 60000))
  if (mins < 60) return `${mins}m left`
  return `${Math.floor(mins / 60)}h ${mins % 60}m left`
}

async function deleteDaily(id: string, imageUrl: string | null) {
  "use server"
  if (imageUrl?.startsWith("http")) {
    const marker = "/storage/v1/object/public/Posts/"
    const idx = imageUrl.indexOf(marker)
    if (idx !== -1) {
      await supabase.storage.from("Posts").remove([imageUrl.slice(idx + marker.length).split("?")[0]])
    }
  }
  await supabase.from("daily_posts").delete().eq("id", id)
  revalidatePath("/dailies")
}

function extractStoragePath(url: string): string | null {
  // Matches both /object/public/Posts/... and /object/sign/Posts/...
  const m = url.match(/\/object\/(?:public|sign)\/Posts\/(.+?)(?:\?|$)/)
  return m ? m[1] : null
}

async function signImageUrl(url: string | null): Promise<string | null> {
  if (!url?.startsWith("http")) return null
  const path = extractStoragePath(url)
  if (!path) return url
  const { data } = await supabase.storage.from("Posts").createSignedUrl(path, 3600)
  return data?.signedUrl ?? url
}

export default async function DailiesPage() {
  const now = new Date().toISOString()
  const tz = await getAdminTZ()

  const { data: dailies } = await supabase
    .from("daily_posts")
    .select(`
      id, content, image_url, created_at, expires_at, user_id,
      profiles:user_id(username, display_name, avatar_url)
    `)
    .gt("expires_at", now)
    .order("created_at", { ascending: false })

  const rawRows = dailies || []

  // Sign all image URLs in parallel so the browser can load them without bucket auth
  const rows = await Promise.all(
    rawRows.map(async (d) => ({
      ...d,
      signed_url: await signImageUrl(d.image_url),
    }))
  )

  const crisisCount = rows.filter(d => hasCrisis(parseContent(d.content).text)).length

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-white mb-1">Dailies</h2>
          <p className="text-gray-500 text-sm">
            {rows.length} active {rows.length === 1 ? "post" : "posts"} · all expire within 24h
          </p>
        </div>
        {crisisCount > 0 && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5">
            <span className="text-red-400 text-sm font-bold">⚠️ {crisisCount} crisis {crisisCount === 1 ? "flag" : "flags"}</span>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-20 text-gray-600 text-sm">No active dailies right now.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map(daily => {
            const { text, feeling, emoji, isUpdate } = parseContent(daily.content)
            const isCrisis = hasCrisis(text)
            const profile = Array.isArray(daily.profiles) ? (daily.profiles as any[])[0] : daily.profiles as any
            const displayName = profile?.display_name || profile?.username || "unknown"
            const username = profile?.username

            return (
              <div
                key={daily.id}
                className={`bg-[#1a1a1a] rounded-2xl p-5 border transition ${
                  isCrisis ? "border-red-500/50 bg-red-500/5" : "border-[#2a2a2a]"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
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

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-white font-bold text-sm">{displayName}</span>
                      {username && <span className="text-gray-500 text-xs">@{username}</span>}
                      {isUpdate && (
                        <span className="bg-[#e378ac] text-white text-[10px] font-black px-2 py-0.5 rounded-full tracking-wide">
                          UPDATE
                        </span>
                      )}
                      {isCrisis && (
                        <span className="bg-red-500/20 text-red-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-500/40 tracking-wide">
                          ⚠️ CRISIS
                        </span>
                      )}
                    </div>

                    {/* Text body */}
                    {text ? (
                      <p className={`text-sm leading-relaxed mb-2 ${isCrisis ? "text-red-300" : "text-gray-200"}`}>
                        {text}
                      </p>
                    ) : null}

                    {/* Feeling strip (update posts) */}
                    {isUpdate && (feeling || emoji) && (
                      <p className="text-xs text-gray-400 mb-2">
                        <span className="text-[#e378ac] font-bold uppercase tracking-wider text-[10px]">Feeling: </span>
                        {feeling}{emoji ? ` ${emoji}` : ""}
                      </p>
                    )}

                    {/* Photo */}
                    {daily.signed_url && (
                      <a href={daily.signed_url} target="_blank" rel="noopener noreferrer" className="block mt-2 mb-2">
                        <Image
                          src={daily.signed_url}
                          alt="daily photo"
                          width={320}
                          height={288}
                          className="max-h-72 max-w-xs rounded-2xl object-cover border border-[#2a2a2a] hover:opacity-90 transition"
                          style={{ width: "auto", height: "auto", maxHeight: "18rem", maxWidth: "20rem" }}
                        />
                      </a>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-[11px] text-gray-600 mt-1">
                      <span>{fmtDate(daily.created_at, tz)} · {fmtTime(daily.created_at, tz)}</span>
                      <span className="text-gray-700">·</span>
                      <span>{timeLeft(daily.expires_at)}</span>
                    </div>
                  </div>

                  {/* Delete */}
                  <form action={deleteDaily.bind(null, daily.id, daily.image_url)}>
                    <button
                      type="submit"
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
    </div>
  )
}
