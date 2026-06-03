import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

async function deletePost(id: string) {
  "use server"
  // Fetch image_url before deleting so we can clean storage
  const { data: post } = await supabase.from("posts").select("image_url").eq("id", id).single()
  if (post?.image_url) {
    const extractUrls = (raw: string) => {
      try { const p = JSON.parse(raw); if (Array.isArray(p)) return p.filter((u: string) => u.startsWith("http")) } catch {}
      return raw.startsWith("http") ? [raw] : []
    }
    const urls = extractUrls(post.image_url)
    await Promise.all(urls.map(async (url: string) => {
      const marker = "/storage/v1/object/public/Posts/"
      const idx = url.indexOf(marker)
      if (idx !== -1) {
        const filePath = url.slice(idx + marker.length).split("?")[0]
        await supabase.storage.from("Posts").remove([filePath])
      }
    }))
  }
  await supabase.from("posts").delete().eq("id", id)
  revalidatePath("/posts")
}

export default async function Posts() {
  const [{ data: posts }, { count: totalCount }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, content, is_anonymous, category, created_at, profiles(username)")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true }),
  ])

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Posts</h2>
      <p className="text-gray-500 text-sm mb-6">
        {totalCount ?? 0} total · showing {posts?.length ?? 0} most recent
      </p>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide">
              <th className="text-left px-6 py-4">Author</th>
              <th className="text-left px-6 py-4">Content</th>
              <th className="text-left px-6 py-4">Type</th>
              <th className="text-left px-6 py-4">Date</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {posts?.map((p, i) => (
              <tr key={p.id} className={`border-b border-[#1f1f1f] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                <td className="px-6 py-4 text-gray-400">
                  {p.is_anonymous
                    ? <span className="text-gray-600 italic">anonymous</span>
                    : `@${(p.profiles as any)?.username}`}
                </td>
                <td className="px-6 py-4 text-gray-300 max-w-xs">
                  <p className="truncate">{p.content || "—"}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    p.is_anonymous
                      ? "bg-purple-400/10 text-purple-400"
                      : "bg-[#e378ac]/10 text-[#e378ac]"
                  }`}>
                    {p.is_anonymous ? "anon" : "public"}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {new Date(p.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <form action={deletePost.bind(null, p.id)}>
                    <button className="text-red-400/50 hover:text-red-400 text-xs font-bold transition">
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
