import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import Link from "next/link"
import DeleteUserButton from "@/components/DeleteUserButton"

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

export default async function Users({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.toLowerCase().trim() ?? ""

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  let query = supabase
    .from("profiles")
    .select("id, username, display_name, email, created_at, invited_by, banned, posts(count)")
    .order("created_at", { ascending: false })

  if (q) {
    query = query.or(`username.ilike.%${q}%,email.ilike.%${q}%,display_name.ilike.%${q}%`)
  }

  const [{ data: users, error }, { count: totalCount }, { count: bannedCount }, { count: todayCount }] = await Promise.all([
    query,
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("banned", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
  ])

  if (error) console.error("Users query error:", error)

  const inviterIds = Array.from(new Set(users?.map(u => u.invited_by).filter(Boolean)))
  const { data: inviters } = inviterIds.length
    ? await supabase.from("profiles").select("id, username").in("id", inviterIds)
    : { data: [] }
  const inviterMap = Object.fromEntries((inviters ?? []).map(i => [i.id, i.username]))

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Users</h2>
      <p className="text-gray-500 text-sm mb-6">
        {totalCount ?? 0} total · {bannedCount ?? 0} banned · {todayCount ?? 0} joined today
      </p>

      {/* Search */}
      <form method="GET" className="mb-4">
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
              <th className="text-left px-6 py-4">Invited by</th>
              <th className="text-left px-6 py-4">Joined</th>
              <th className="text-left px-6 py-4">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u, i) => (
              <tr key={u.id} className={`border-b border-[#1f1f1f] ${u.banned ? "opacity-50" : ""} ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                <td className="px-6 py-4">
                  <Link href={`/users/${u.id}`} className="hover:text-[#e378ac] transition">
                    <p className="font-bold text-white">@{u.username}</p>
                    {u.display_name && <p className="text-gray-500 text-xs">{u.display_name}</p>}
                  </Link>
                </td>
                <td className="px-6 py-4 text-gray-400">{u.email ?? "—"}</td>
                <td className="px-6 py-4 text-[#e378ac] font-bold">{(u as any).posts?.[0]?.count ?? 0}</td>
                <td className="px-6 py-4 text-gray-400">
                  {u.invited_by
                    ? <Link href={`/users/${u.invited_by}`} className="hover:text-[#e378ac] transition">@{inviterMap[u.invited_by] ?? "unknown"}</Link>
                    : <span className="text-gray-600">direct</span>}
                </td>
                <td className="px-6 py-4 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  {u.banned
                    ? <span className="bg-red-500/10 text-red-400 text-xs font-bold px-2 py-1 rounded-full">Banned</span>
                    : <span className="bg-green-400/10 text-green-400 text-xs font-bold px-2 py-1 rounded-full">Active</span>}
                </td>
                <td className="px-6 py-4">
                  <DeleteUserButton action={deleteUser.bind(null, u.id)} username={u.username} />
                </td>
              </tr>
            ))}
            {users?.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-600">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
