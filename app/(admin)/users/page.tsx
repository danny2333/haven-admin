import { supabase } from "@/lib/supabase"
import { fmtDate, fmtTime, getAdminTZ, localDayStart } from "@/lib/date"
import { revalidatePath } from "next/cache"
import Link from "next/link"
import DeleteUserButton from "@/components/DeleteUserButton"

export const revalidate = 0

async function deleteUser(userId: string) {
  "use server"

  const log = (step: string, error: any) => {
    if (error) console.error(`deleteUser [${step}]:`, JSON.stringify(error))
  }

  // Step 1 — remove leaf rows referencing the user directly
  const step1 = await Promise.all([
    supabase.from("likes").delete().eq("user_id", userId),
    supabase.from("replies").delete().eq("user_id", userId),
    supabase.from("moodboard_items").delete().eq("user_id", userId),
    supabase.from("follows").delete().eq("follower_id", userId),
    supabase.from("follows").delete().eq("following_id", userId),
    supabase.from("notifications").delete().eq("user_id", userId),
    supabase.from("notifications").update({ from_user_id: null }).eq("from_user_id", userId),
    supabase.from("blocks").delete().eq("blocker_id", userId),
    supabase.from("blocks").delete().eq("blocked_id", userId),
    supabase.from("daily_posts").delete().eq("user_id", userId),
    supabase.from("invite_codes").update({ created_by: null }).eq("created_by", userId),
    supabase.from("invite_codes").update({ used_by: null }).eq("used_by", userId),
  ])
  step1.forEach((r, i) => log(`step1[${i}]`, (r as any).error))

  // Step 2 — messages and conversations
  const { data: convos } = await supabase
    .from("conversations")
    .select("id")
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
  if (convos?.length) {
    const ids = convos.map(c => c.id)
    const { error: me } = await supabase.from("messages").delete().in("conversation_id", ids)
    log("messages", me)
    const { error: ce } = await supabase.from("conversations").delete().in("id", ids)
    log("conversations", ce)
  }

  // Step 3 — moodboards (after moodboard_items are gone)
  const { error: mbe } = await supabase.from("moodboards").delete().eq("user_id", userId)
  log("moodboards", mbe)

  // Step 4 — posts
  const { error: pe } = await supabase.from("posts").delete().eq("user_id", userId)
  log("posts", pe)

  // Step 5 — profile
  const { error: profileErr } = await supabase.from("profiles").delete().eq("id", userId)
  log("profile", profileErr)

  // Step 6 — auth user (must be last)
  const { error: authErr } = await supabase.auth.admin.deleteUser(userId)
  log("auth", authErr)

  revalidatePath("/users", "page")
}

const FILTERS = [
  { label: "All",             value: "all" },
  { label: "Active Today",    value: "active_today" },
  { label: "Active This Week", value: "active_week" },
  { label: "Recent",          value: "recent" },
  { label: "Banned",          value: "banned" },
  { label: "Suspended",       value: "suspended" },
]

export default async function Users({ searchParams }: { searchParams: { q?: string; filter?: string } }) {
  const tz     = await getAdminTZ()
  const q      = searchParams.q?.toLowerCase().trim() ?? ""
  const filter = FILTERS.find(f => f.value === searchParams.filter)?.value ?? "all"

  const todayStart = localDayStart()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  let query = supabase
    .from("profiles")
    .select("id, username, display_name, email, created_at, last_seen_at, invited_by, banned, suspended_until, posts(count)")

  if (q) {
    query = query.or(`username.ilike.%${q}%,email.ilike.%${q}%,display_name.ilike.%${q}%`)
  }

  if (filter === "recent")       query = query.gte("created_at", sevenDaysAgo)
  if (filter === "banned")       query = query.eq("banned", true)
  if (filter === "suspended")    query = query.not("suspended_until", "is", null).gt("suspended_until", new Date().toISOString())
  if (filter === "active_today") query = query.gte("last_seen_at", todayStart.toISOString())
  if (filter === "active_week")  query = query.gte("last_seen_at", sevenDaysAgo)

  // Most-recently-active first when looking at activity, newest-signup first otherwise
  query = filter === "active_today" || filter === "active_week"
    ? query.order("last_seen_at", { ascending: false })
    : query.order("created_at", { ascending: false })

  const [{ data: users, error }, { count: totalCount }, { count: bannedCount }, { count: todayCount }, { count: dauCount }] = await Promise.all([
    query,
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("banned", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("last_seen_at", todayStart.toISOString()),
  ])

  if (error) console.error("Users query error:", error)

  const userIds = users?.map(u => u.id) ?? []
  const userEmails = (users?.map(u => u.email).filter(Boolean) ?? []) as string[]
  const inviterIds = Array.from(new Set(users?.map(u => u.invited_by).filter(Boolean)))

  const [
    { data: inviters },
    { data: waitlistEntries },
    { data: followerRows },
    { data: followingRows },
  ] = await Promise.all([
    inviterIds.length
      ? supabase.from("profiles").select("id, username").in("id", inviterIds)
      : { data: [] as { id: string; username: string }[] },
    userEmails.length
      ? supabase.from("waitlist").select("email").eq("status", "approved").in("email", userEmails)
      : { data: [] as { email: string }[] },
    userIds.length
      ? supabase.from("follows").select("following_id").in("following_id", userIds)
      : { data: [] as { following_id: string }[] },
    userIds.length
      ? supabase.from("follows").select("follower_id").in("follower_id", userIds)
      : { data: [] as { follower_id: string }[] },
  ])

  const inviterMap = Object.fromEntries((inviters ?? []).map(i => [i.id, i.username]))
  const waitlistSet = new Set((waitlistEntries ?? []).map(w => w.email?.toLowerCase()))

  const followerMap: Record<string, number> = {}
  const followingMap: Record<string, number> = {}
  followerRows?.forEach(f => { followerMap[f.following_id] = (followerMap[f.following_id] || 0) + 1 })
  followingRows?.forEach(f => { followingMap[f.follower_id] = (followingMap[f.follower_id] || 0) + 1 })

  const getEntry = (u: any) => {
    if (u.invited_by) return "invited"
    if (waitlistSet.has(u.email?.toLowerCase())) return "waitlist"
    return "direct"
  }

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Users</h2>
      <p className="text-gray-500 text-sm mb-6">
        {totalCount ?? 0} total · {dauCount ?? 0} active today · {bannedCount ?? 0} banned · {todayCount ?? 0} joined today
      </p>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {FILTERS.map(f => (
          <Link
            key={f.value}
            href={`/users?filter=${f.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
              filter === f.value
                ? "bg-[#e378ac] text-white"
                : "bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2a2a2a]"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Search */}
      <form method="GET" className="mb-4">
        <input type="hidden" name="filter" value={filter} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by username, email or name…"
          className="w-full max-w-md bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#e378ac]"
        />
      </form>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide">
              <th className="text-left px-6 py-4">User</th>
              <th className="text-left px-6 py-4">Email</th>
              <th className="text-left px-6 py-4">Posts</th>
              <th className="text-left px-6 py-4">Followers / Following</th>
              <th className="text-left px-6 py-4">How they got in</th>
              <th className="text-left px-6 py-4">Joined</th>
              <th className="text-left px-6 py-4">Last Active</th>
              <th className="text-left px-6 py-4">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u, i) => {
              const entry = getEntry(u)
              const followers = followerMap[u.id] ?? 0
              const following = followingMap[u.id] ?? 0
              return (
                <tr key={u.id} className={`border-b border-[#1f1f1f] ${u.banned ? "opacity-50" : ""} ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                  <td className="px-6 py-4">
                    <Link href={`/users/${u.id}`} className="hover:text-[#e378ac] transition">
                      <p className="font-bold text-white">@{u.username}</p>
                      {u.display_name && <p className="text-gray-500 text-xs">{u.display_name}</p>}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{u.email ?? "—"}</td>
                  <td className="px-6 py-4 text-[#e378ac] font-bold">{(u as any).posts?.[0]?.count ?? 0}</td>
                  <td className="px-6 py-4">
                    <span className="text-white font-bold">{followers}</span>
                    <span className="text-gray-600 text-xs"> followers · </span>
                    <span className="text-gray-300 font-semibold">{following}</span>
                    <span className="text-gray-600 text-xs"> following</span>
                  </td>
                  <td className="px-6 py-4">
                    {entry === "waitlist" && (
                      <span className="bg-blue-400/10 text-blue-400 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">
                        🕊️ Waitlist
                      </span>
                    )}
                    {entry === "invited" && (
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        🔗 <Link href={`/users/${u.invited_by}`} className="hover:text-[#e378ac] transition font-semibold">
                          @{inviterMap[u.invited_by] ?? "unknown"}
                        </Link>
                      </span>
                    )}
                    {entry === "direct" && (
                      <span className="bg-[#e378ac]/10 text-[#e378ac] text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">
                        ✦ Direct
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    <div>{fmtDate(u.created_at, tz)}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{fmtTime(u.created_at, tz)}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {(u as any).last_seen_at ? (
                      <>
                        <div>{fmtDate((u as any).last_seen_at, tz)}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{fmtTime((u as any).last_seen_at, tz)}</div>
                      </>
                    ) : <span className="text-gray-700">Never</span>}
                  </td>
                  <td className="px-6 py-4">
                    {u.banned
                      ? <span className="bg-red-500/10 text-red-400 text-xs font-bold px-2 py-1 rounded-full">Banned</span>
                      : (u as any).suspended_until && new Date((u as any).suspended_until) > new Date()
                        ? <span className="bg-yellow-500/10 text-yellow-400 text-xs font-bold px-2 py-1 rounded-full">Suspended</span>
                        : <span className="bg-green-400/10 text-green-400 text-xs font-bold px-2 py-1 rounded-full">Active</span>}
                  </td>
                  <td className="px-6 py-4">
                    <DeleteUserButton action={deleteUser.bind(null, u.id)} username={u.username} />
                  </td>
                </tr>
              )
            })}
            {users?.length === 0 && (
              <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-600">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
