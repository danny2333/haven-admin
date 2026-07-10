"use client"

import { startTransition, useState } from "react"
import { deleteCommunityPost, removeMember } from "./actions"

type Post = {
  id: string
  title: string | null
  content: string | null
  image_url: string | null
  flair: string | null
  created_at: string
  user_id: string
  author: { username: string; avatar_url: string | null } | null
}

type Member = {
  user_id: string
  role: string
  status: string
  created_at: string
  profile: { username: string; avatar_url: string | null } | null
}

export default function CommunityDetail({
  communityId,
  posts: initialPosts,
  members: initialMembers,
}: {
  communityId: string
  posts: Post[]
  members: Member[]
}) {
  const [tab, setTab] = useState<"posts" | "members">("posts")
  const [posts, setPosts] = useState(initialPosts)
  const [members, setMembers] = useState(initialMembers)
  const [pendingPost, setPendingPost] = useState<string | null>(null)
  const [pendingMember, setPendingMember] = useState<string | null>(null)

  const handleDeletePost = (postId: string) => {
    if (!confirm("Delete this post? This cannot be undone.")) return
    setPendingPost(postId)
    startTransition(async () => {
      const { error } = await deleteCommunityPost(postId, communityId)
      if (error) { alert(`Error: ${error}`); setPendingPost(null); return }
      setPosts(prev => prev.filter(p => p.id !== postId))
      setPendingPost(null)
    })
  }

  const handleRemoveMember = (userId: string, username: string) => {
    if (!confirm(`Remove @${username} from this community?`)) return
    setPendingMember(userId)
    startTransition(async () => {
      const { error } = await removeMember(userId, communityId)
      if (error) { alert(`Error: ${error}`); setPendingMember(null); return }
      setMembers(prev => prev.filter(m => m.user_id !== userId))
      setPendingMember(null)
    })
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-[#111] border border-[#2a2a2a] rounded-xl p-1 w-fit">
        {(["posts", "members"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition ${
              tab === t
                ? "bg-[#e378ac] text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t === "posts" ? `Posts (${posts.length})` : `Members (${members.length})`}
          </button>
        ))}
      </div>

      {/* Posts */}
      {tab === "posts" && (
        <div className="flex flex-col gap-3">
          {posts.length === 0 && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-12 text-center text-gray-600 text-sm">
              No posts in this community.
            </div>
          )}
          {posts.map(post => (
            <div key={post.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[#e378ac] text-xs font-bold">
                      @{post.author?.username ?? "unknown"}
                    </span>
                    {post.flair && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">{post.flair}</span>
                    )}
                    <span className="text-gray-600 text-xs">
                      {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  {post.title && (
                    <p className="text-white font-bold text-sm mb-1">{post.title}</p>
                  )}
                  {post.content && (
                    <p className="text-gray-400 text-sm leading-relaxed line-clamp-4">{post.content}</p>
                  )}
                  {post.image_url && (
                    <p className="text-[#e378ac] text-xs mt-2">📎 Has image</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeletePost(post.id)}
                  disabled={pendingPost === post.id}
                  className="text-red-400/50 hover:text-red-400 text-xs font-bold transition disabled:opacity-30 shrink-0"
                >
                  {pendingPost === post.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Members */}
      {tab === "members" && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          {members.length === 0 && (
            <p className="text-center text-gray-600 py-12 text-sm">No members.</p>
          )}
          <table className="w-full text-sm">
            {members.length > 0 && (
              <thead>
                <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-6 py-4">Member</th>
                  <th className="text-left px-6 py-4">Role</th>
                  <th className="text-left px-6 py-4">Joined</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
            )}
            <tbody>
              {members.map((m, i) => (
                <tr key={m.user_id} className={`border-b border-[#1f1f1f] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                  <td className="px-6 py-4 text-gray-300">@{m.profile?.username ?? "unknown"}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      m.role === "admin"
                        ? "bg-[#e378ac]/10 text-[#e378ac]"
                        : "bg-white/5 text-gray-400"
                    }`}>
                      {m.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-6 py-4">
                    {m.role !== "admin" && (
                      <button
                        onClick={() => handleRemoveMember(m.user_id, m.profile?.username ?? "user")}
                        disabled={pendingMember === m.user_id}
                        className="text-red-400/50 hover:text-red-400 text-xs font-bold transition disabled:opacity-30"
                      >
                        {pendingMember === m.user_id ? "Removing…" : "Remove"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
