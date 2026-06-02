import { supabase } from "@/lib/supabase"
import Link from "next/link"

export default async function Users({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.toLowerCase().trim() ?? ""

  let query = supabase
    .from("profiles")
    .select("id, username, display_name, email, created_at, invited_by, banned")
    .order("created_at", { ascending: false })

  if (q) {
    query = query.or(`username.ilike.%${q}%,email.ilike.%${q}%,display_name.ilike.%${q}%`)
  }

  const { data: users } = await query

  const inviterIds = Array.from(new Set(users?.map(u => u.invited_by).filter(Boolean)))
  const { data: inviters } = inviterIds.length
    ? await supabase.from("profiles").select("id, username").in("id", inviterIds)
    : { data: [] }
  const inviterMap = Object.fromEntries((inviters ?? []).map(i => [i.id, i.username]))

  const { data: postCounts } = await supabase.from("posts").select("user_id")
  const postMap: Record<string, number> = {}
  postCounts?.forEach(p => { postMap[p.user_id] = (postMap[p.user_id] || 0) + 1 })

  const total  = users?.length ?? 0
  const banned = users?.filter(u => u.banned).length ?? 0
  const today  = users?.filter(u => new Date(u.created_at).toDateString() === new Date().toDateString()).length ?? 0

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Users</h2>
      <p className="text-gray-500 text-sm mb-6">{total} total · {banned} banned · {today} joined today</p>

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
                <td className="px-6 py-4 text-[#e378ac] font-bold">{postMap[u.id] ?? 0}</td>
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
              </tr>
            ))}
            {users?.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-600">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
