"use client"
import { useState } from "react"
import ImagePreviewButton from "@/components/ImagePreviewButton"

type Post = {
  id: string
  content: string | null
  image_url: string | null
  is_anonymous: boolean
  category: string | null
  created_at: string
  imageUrls: string[]
}

function parseTextCard(raw: string | null): { text: string; bg: string; textColor: string } | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed?._type === "text-card" && parsed.text) return parsed
  } catch {}
  return null
}

type Props = {
  posts: Post[]
  likeMap: Record<string, number>
  replyMap: Record<string, number>
  deleteAction: (postId: string) => Promise<void>
}

export default function PostsCarousel({ posts, likeMap, replyMap, deleteAction }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleted, setDeleted] = useState<Set<string>>(new Set())

  if (!posts.length) {
    return <p className="text-gray-600 text-sm">No posts yet</p>
  }

  const visible = posts.filter(p => !deleted.has(p.id))

  const handleDelete = async (postId: string) => {
    if (!confirm("Delete this post?")) return
    setDeletingId(postId)
    await deleteAction(postId)
    setDeleted(prev => new Set([...prev, postId]))
    setDeletingId(null)
  }

  return (
    <div>
      <p className="text-gray-500 text-xs uppercase tracking-wide mb-3">
        Public Posts ({visible.length})
      </p>

      <div className="flex flex-col gap-3 max-h-[640px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#2a2a2a]">
        {visible.map(post => (
          <div key={post.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 shrink-0">
            {/* Meta */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {post.is_anonymous && (
                  <span className="bg-purple-400/10 text-purple-400 text-xs font-bold px-2 py-0.5 rounded-full">anon</span>
                )}
                {post.category && (
                  <span className="bg-[#e378ac]/10 text-[#e378ac] text-xs font-semibold px-2 py-0.5 rounded-full">
                    {post.category}
                  </span>
                )}
                <span className="text-gray-600 text-xs">
                  {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <button
                onClick={() => handleDelete(post.id)}
                disabled={deletingId === post.id}
                className="text-red-400/40 hover:text-red-400 text-xs font-bold transition disabled:opacity-50 shrink-0"
              >
                {deletingId === post.id ? "Deleting…" : "Delete"}
              </button>
            </div>

            {/* Content */}
            {post.content && (
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap mb-3">{post.content}</p>
            )}

            {/* Text card */}
            {(() => {
              const tc = parseTextCard(post.image_url)
              if (!tc) return null
              return (
                <div
                  className="rounded-xl px-4 py-5 mb-3 text-center text-sm font-bold leading-snug"
                  style={{ backgroundColor: tc.bg, color: tc.textColor }}
                >
                  {tc.text}
                </div>
              )
            })()}

            {/* Images */}
            {post.imageUrls.length > 0 && (
              <div className="mb-3">
                <ImagePreviewButton urls={post.imageUrls} />
              </div>
            )}

            {/* Stats */}
            <div className="flex gap-4 text-xs text-gray-600 pt-3 border-t border-[#2a2a2a]">
              <span>❤️ {likeMap[post.id] ?? 0}</span>
              <span>💬 {replyMap[post.id] ?? 0}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
