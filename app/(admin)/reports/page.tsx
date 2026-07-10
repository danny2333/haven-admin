import ReportCard from "@/components/ReportCard"
import { supabase } from "@/lib/supabase"

export const revalidate = 0

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function Reports() {
  const [
    { data: reports, error },
    { count: pendingCount },
    { count: resolvedCount },
  ] = await Promise.all([
    supabase.from("reports").select("*").order("created_at", { ascending: false }),
    supabase.from("reports").select("id", { count: "exact", head: true }).or("status.is.null,status.eq.pending"),
    supabase.from("reports").select("id", { count: "exact", head: true }).not("status", "is", null).neq("status", "pending"),
  ])

  if (error) console.error("Reports query error:", error)

  const userIds = [...new Set([
    ...(reports ?? []).map(r => r.reporter_id),
    ...(reports ?? []).map(r => r.reported_user_id),
  ].filter(Boolean))]

  const postIds          = [...new Set((reports ?? []).map(r => r.reported_post_id).filter(Boolean))]
  const messageIds       = [...new Set((reports ?? []).map(r => r.reported_message_id).filter(Boolean))]
  const communityPostIds = [...new Set((reports ?? []).map(r => r.reported_community_post_id).filter(Boolean))]

  const [{ data: profiles }, { data: reportedPosts }, { data: reportedMessages }, { data: reportedCommunityPosts }] = await Promise.all([
    userIds.length > 0
      ? supabase.from("profiles").select("id, username, email").in("id", userIds)
      : Promise.resolve({ data: [] }),
    postIds.length > 0
      ? supabase.from("posts").select("id, content, image_url, is_anonymous, user_id, profiles(username)").in("id", postIds)
      : Promise.resolve({ data: [] }),
    messageIds.length > 0
      ? supabase.from("messages").select("id, content, image_url, sender_id").in("id", messageIds)
      : Promise.resolve({ data: [] }),
    communityPostIds.length > 0
      ? supabase.from("community_posts").select("id, title, content, image_url, user_id, community_id, profiles:user_id(username), communities:community_id(name)").in("id", communityPostIds)
      : Promise.resolve({ data: [] }),
  ])

  const profileMap: Record<string, { username: string; email: string }> = {}
  for (const p of profiles ?? []) profileMap[p.id] = { username: p.username, email: p.email }

  const postMap: Record<string, any> = {}
  for (const p of reportedPosts ?? []) postMap[p.id] = { content: p.content, image_url: p.image_url ?? null, is_anonymous: p.is_anonymous, username: (p.profiles as any)?.username ?? null }

  const messageMap: Record<string, any> = {}
  for (const m of reportedMessages ?? []) messageMap[m.id] = { content: m.content, image_url: m.image_url ?? null, sender_id: m.sender_id }

  const communityPostMap: Record<string, any> = {}
  for (const p of reportedCommunityPosts ?? []) communityPostMap[p.id] = { title: p.title ?? null, content: p.content ?? null, image_url: p.image_url ?? null, username: (p.profiles as any)?.username ?? null, community: (p.communities as any)?.name ?? null }

  const PRIORITY_ORDER: Record<string, number> = { p0: 0, p1: 1, p2: 2, p3: 3 }
  const pending  = (reports?.filter(r => !r.status || r.status === "pending") ?? [])
    .sort((a, b) => (PRIORITY_ORDER[a.priority ?? "p2"] ?? 2) - (PRIORITY_ORDER[b.priority ?? "p2"] ?? 2))
  const resolved = reports?.filter(r => r.status && r.status !== "pending") ?? []

  const ACTION_LABEL: Record<string, string> = {
    content_removed: "L1 · Removed",
    warned:          "L2 · Warned",
    suspended:       "L3 · Suspended",
    banned:          "L4 · Banned",
    dismissed:       "Dismissed",
  }
  const ACTION_COLOR: Record<string, string> = {
    content_removed: "bg-blue-400/10 text-blue-400",
    warned:          "bg-yellow-400/10 text-yellow-400",
    suspended:       "bg-orange-400/10 text-orange-400",
    banned:          "bg-red-400/10 text-red-400",
    dismissed:       "bg-white/5 text-gray-500",
  }

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Reports</h2>
      <p className="text-gray-500 text-sm mb-6">
        {pendingCount ?? 0} pending · {resolvedCount ?? 0} resolved
      </p>

      {/* Pending */}
      {pending.length === 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-12 text-center text-gray-600 text-sm mb-8">
          No pending reports. ✓
        </div>
      )}

      {pending.length > 0 && (
        <div className="flex flex-col gap-4 mb-10">
          {pending.map(r => (
            <ReportCard
              key={r.id}
              report={r}
              reporter={profileMap[r.reporter_id]}
              reported={profileMap[r.reported_user_id]}
              postContent={r.reported_post_id ? postMap[r.reported_post_id] ?? null : null}
              messageContent={r.reported_message_id ? messageMap[r.reported_message_id] ?? null : null}
              communityPostContent={r.reported_community_post_id ? communityPostMap[r.reported_community_post_id] ?? null : null}
            />
          ))}
        </div>
      )}

      {/* Resolved log */}
      {resolved.length > 0 && (
        <>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Resolved</h3>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-6 py-4">Priority</th>
                  <th className="text-left px-6 py-4">Reported User</th>
                  <th className="text-left px-6 py-4">Reason</th>
                  <th className="text-left px-6 py-4">Action</th>
                  <th className="text-left px-6 py-4">Resolved</th>
                </tr>
              </thead>
              <tbody>
                {resolved.map((r, i) => {
                  const pri = (r.priority ?? "p2") as string
                  const PRIORITY_COLORS: Record<string, string> = {
                    p0: "bg-red-500/10 text-red-400 border-red-500/20",
                    p1: "bg-orange-500/10 text-orange-400 border-orange-500/20",
                    p2: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
                    p3: "bg-white/5 text-gray-400 border-white/10",
                  }
                  return (
                    <tr key={r.id} className={`border-b border-[#1f1f1f] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[pri] ?? PRIORITY_COLORS.p2}`}>
                          {pri.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">@{profileMap[r.reported_user_id]?.username ?? "unknown"}</td>
                      <td className="px-6 py-4 text-gray-500 max-w-xs"><p className="truncate">{r.reason ?? "—"}</p></td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${ACTION_COLOR[r.action ?? r.status] ?? "bg-white/5 text-gray-500"}`}>
                          {ACTION_LABEL[r.action ?? r.status] ?? (r.action ?? r.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {r.resolved_at
                          ? new Date(r.resolved_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          : new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
