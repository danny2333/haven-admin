import Link from "next/link"
import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import CommunityDetail from "./CommunityDetail"

export default async function CommunityDetailPage({ params }: { params: { id: string } }) {
  const { id } = params

  const [
    { data: community },
    { data: posts },
    { data: members },
  ] = await Promise.all([
    supabase
      .from("communities")
      .select("id, name, description, category, is_private, emoji, banner_color, created_by, created_at")
      .eq("id", id)
      .single(),
    supabase
      .from("community_posts")
      .select("id, title, content, image_url, flair, created_at, user_id")
      .eq("community_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("community_members")
      .select("user_id, role, status, created_at")
      .eq("community_id", id)
      .eq("status", "approved")
      .order("created_at", { ascending: true }),
  ])

  if (!community) return notFound()

  const allUserIds = [
    ...new Set([
      community.created_by,
      ...(posts ?? []).map(p => p.user_id),
      ...(members ?? []).map(m => m.user_id),
    ].filter(Boolean))
  ]

  const { data: profiles } = allUserIds.length > 0
    ? await supabase.from("profiles").select("id, username, avatar_url").in("id", allUserIds)
    : { data: [] }

  const profileMap: Record<string, { username: string; avatar_url: string | null }> = {}
  for (const p of profiles ?? []) profileMap[p.id] = { username: p.username, avatar_url: p.avatar_url }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/communities" className="hover:text-[#e378ac] transition">Communities</Link>
        <span>›</span>
        <span className="text-white">{community.emoji ?? "🏘️"} {community.name}</span>
      </div>

      {/* Header */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ backgroundColor: community.banner_color ?? "#e378ac" }}
          >
            {community.emoji ?? "🏘️"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-black text-white">{community.name}</h2>
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                community.is_private
                  ? "bg-yellow-400/10 text-yellow-400"
                  : "bg-[#e378ac]/10 text-[#e378ac]"
              }`}>
                {community.is_private ? "Private" : "Public"}
              </span>
              {community.category && (
                <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400">{community.category}</span>
              )}
            </div>
            {community.description && (
              <p className="text-gray-400 text-sm mt-1">{community.description}</p>
            )}
            <div className="flex gap-6 mt-3 text-xs text-gray-500">
              <span>Created by <span className="text-gray-300">@{profileMap[community.created_by]?.username ?? "unknown"}</span></span>
              <span>{new Date(community.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
              <span><span className="text-white font-bold">{members?.length ?? 0}</span> members</span>
              <span><span className="text-white font-bold">{posts?.length ?? 0}</span> posts</span>
            </div>
          </div>
        </div>
      </div>

      <CommunityDetail
        communityId={id}
        posts={(posts ?? []).map(p => ({ ...p, author: profileMap[p.user_id] ?? null }))}
        members={(members ?? []).map(m => ({ ...m, profile: profileMap[m.user_id] ?? null }))}
      />
    </div>
  )
}
