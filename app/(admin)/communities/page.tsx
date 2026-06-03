import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

async function deleteCommunity(id: string) {
  "use server"
  const { data: posts } = await supabase
    .from("community_posts")
    .select("id")
    .eq("community_id", id)
  const postIds = posts?.map(p => p.id) ?? []

  if (postIds.length > 0) {
    await supabase.from("community_post_votes").delete().in("post_id", postIds)
    await supabase.from("community_replies").delete().in("post_id", postIds)
  }
  await supabase.from("community_posts").delete().eq("community_id", id)
  await supabase.from("community_members").delete().eq("community_id", id)
  await supabase.from("community_tags").delete().eq("community_id", id)
  await supabase.from("communities").delete().eq("id", id)
  revalidatePath("/communities")
}

export default async function Communities() {
  const [{ data: communities, error }, { count: totalCount }] = await Promise.all([
    supabase
      .from("communities")
      .select("id, name, description, category, is_private, emoji, created_by, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("communities").select("id", { count: "exact", head: true }),
  ])

  if (error) console.error("Communities query error:", error)

  const creatorIds = [...new Set((communities ?? []).map(c => c.created_by).filter(Boolean))]

  const { data: profiles } = creatorIds.length > 0
    ? await supabase.from("profiles").select("id, username").in("id", creatorIds)
    : { data: [] }

  const profileMap: Record<string, string> = {}
  for (const p of profiles ?? []) {
    profileMap[p.id] = p.username
  }

  const ids = communities?.map(c => c.id) ?? []

  const { data: memberCounts } = ids.length > 0
    ? await supabase.from("community_members").select("community_id").in("community_id", ids).eq("status", "approved")
    : { data: [] }

  const { data: postCounts } = ids.length > 0
    ? await supabase.from("community_posts").select("community_id").in("community_id", ids)
    : { data: [] }

  const memberMap: Record<string, number> = {}
  const postMap: Record<string, number> = {}

  for (const row of memberCounts ?? []) {
    memberMap[row.community_id] = (memberMap[row.community_id] ?? 0) + 1
  }
  for (const row of postCounts ?? []) {
    postMap[row.community_id] = (postMap[row.community_id] ?? 0) + 1
  }

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Communities</h2>
      <p className="text-gray-500 text-sm mb-6">{totalCount ?? 0} total</p>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide">
              <th className="text-left px-6 py-4">Community</th>
              <th className="text-left px-6 py-4">Category</th>
              <th className="text-left px-6 py-4">Creator</th>
              <th className="text-left px-6 py-4">Members</th>
              <th className="text-left px-6 py-4">Posts</th>
              <th className="text-left px-6 py-4">Type</th>
              <th className="text-left px-6 py-4">Created</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {communities?.map((c, i) => (
              <tr key={c.id} className={`border-b border-[#1f1f1f] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{c.emoji ?? "🏘️"}</span>
                    <div>
                      <p className="text-white font-semibold">{c.name}</p>
                      {c.description && (
                        <p className="text-gray-500 text-xs truncate max-w-[180px]">{c.description}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {c.category ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400">
                      {c.category}
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-400">
                  {profileMap[c.created_by] ? `@${profileMap[c.created_by]}` : "—"}
                </td>
                <td className="px-6 py-4 text-gray-300 font-semibold">
                  {memberMap[c.id] ?? 0}
                </td>
                <td className="px-6 py-4 text-gray-300 font-semibold">
                  {postMap[c.id] ?? 0}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    c.is_private
                      ? "bg-yellow-400/10 text-yellow-400"
                      : "bg-[#e378ac]/10 text-[#e378ac]"
                  }`}>
                    {c.is_private ? "private" : "public"}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <form action={deleteCommunity.bind(null, c.id)}>
                    <button className="text-red-400/50 hover:text-red-400 text-xs font-bold transition">
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!communities || communities.length === 0) && (
          <p className="text-center text-gray-600 py-12 text-sm">No communities yet.</p>
        )}
      </div>
    </div>
  )
}
