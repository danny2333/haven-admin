import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import Link from "next/link"
import { notFound } from "next/navigation"

async function banUser(userId: string, reason: string) {
  "use server"
  await supabase.from("profiles").update({
    banned: true,
    ban_reason: reason,
    banned_at: new Date().toISOString(),
  }).eq("id", userId)
  // Disable their Supabase Auth account so they can't log back in
  await supabase.auth.admin.updateUserById(userId, { ban_duration: "876600h" })
  revalidatePath(`/users/${userId}`)
  revalidatePath("/users")
}

async function unbanUser(userId: string) {
  "use server"
  await supabase.from("profiles").update({
    banned: false,
    ban_reason: null,
    banned_at: null,
  }).eq("id", userId)
  // Re-enable their Supabase Auth account
  await supabase.auth.admin.updateUserById(userId, { ban_duration: "none" })
  revalidatePath(`/users/${userId}`)
  revalidatePath("/users")
}

async function deletePost(postId: string, userId: string) {
  "use server"
  await supabase.from("posts").delete().eq("id", postId)
  revalidatePath(`/users/${userId}`)
}

async function giveUserCodes(userId: string, count: number) {
  "use server"
  const CHARS = "ABCDEFGHJKLMNPQRTUVWXYZ2346789"
  const randomCode = () => {
    let code = ""
    for (let i = 0; i < 8; i++) {
      if (i === 4) code += "-"
      code += CHARS[Math.floor(Math.random() * CHARS.length)]
    }
    return code
  }
  const rows = Array.from({ length: count }, () => ({ code: randomCode(), created_by: userId }))
  await supabase.from("invite_codes").insert(rows)
  revalidatePath(`/users/${userId}`)
}

export default async function UserDetail({ params }: { params: { id: string } }) {
  const { id } = params

  // Get user profile
  const { data: user } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single()

  if (!user) notFound()

  // Get who invited them + which code
  const { data: usedCode } = await supabase
    .from("invite_codes")
    .select("code, created_by")
    .eq("used_by", id)
    .maybeSingle()

  const { data: inviter } = usedCode?.created_by
    ? await supabase.from("profiles").select("id, username").eq("id", usedCode.created_by).single()
    : { data: null }

  // Get people this user invited
  const { data: invitedUsers } = await supabase
    .from("invite_codes")
    .select("code, used_by, used_at")
    .eq("created_by", id)
    .not("used_by", "is", null)

  const invitedIds = invitedUsers?.map(i => i.used_by).filter(Boolean) ?? []
  const { data: invitedProfiles } = invitedIds.length
    ? await supabase.from("profiles").select("id, username, banned").in("id", invitedIds)
    : { data: [] }

  // Get their public posts only — anonymous posts are private to the user
  const { data: posts } = await supabase
    .from("posts")
    .select("id, content, image_url, is_anonymous, category, created_at")
    .eq("user_id", id)
    .eq("is_anonymous", false)
    .order("created_at", { ascending: false })

  // Get their unused codes
  const { data: userCodes } = await supabase
    .from("invite_codes")
    .select("code, used_by")
    .eq("created_by", id)

  const unusedCodes = userCodes?.filter(c => !c.used_by) ?? []

  // Get like + reply counts
  const postIds = posts?.map(p => p.id) ?? []
  const { data: likes } = postIds.length
    ? await supabase.from("likes").select("post_id").in("post_id", postIds)
    : { data: [] }
  const { data: replies } = postIds.length
    ? await supabase.from("replies").select("post_id").in("post_id", postIds)
    : { data: [] }

  const likeMap: Record<string, number> = {}
  const replyMap: Record<string, number> = {}
  likes?.forEach(l => { likeMap[l.post_id] = (likeMap[l.post_id] || 0) + 1 })
  replies?.forEach(r => { replyMap[r.post_id] = (replyMap[r.post_id] || 0) + 1 })

  return (
    <div className="max-w-4xl">
      {/* Back */}
      <Link href="/users" className="text-gray-500 hover:text-white text-sm mb-6 inline-flex items-center gap-2 transition">
        ← Back to Users
      </Link>

      {/* Header */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 mt-4 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-black text-white">@{user.username}</h2>
              {user.banned && (
                <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold px-2 py-1 rounded-full">
                  BANNED
                </span>
              )}
            </div>
            {user.display_name && <p className="text-gray-400 mb-1">{user.display_name}</p>}
            <p className="text-[#e378ac] text-sm mb-1">{user.email}</p>
            <p className="text-gray-600 text-xs">
              Joined {new Date(user.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
            {user.banned && user.ban_reason && (
              <p className="text-red-400/70 text-xs mt-2">Ban reason: {user.ban_reason}</p>
            )}
          </div>

          {/* Ban / Unban */}
          <div className="shrink-0">
            {user.banned ? (
              <form action={unbanUser.bind(null, id)}>
                <button className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 font-bold px-5 py-2.5 rounded-xl text-sm transition">
                  Unban User
                </button>
              </form>
            ) : (
              <form action={async (formData: FormData) => {
                "use server"
                const reason = formData.get("reason") as string
                await banUser(id, reason || "Banned by admin")
              }} className="flex flex-col gap-2">
                <input
                  name="reason"
                  placeholder="Ban reason (optional)"
                  className="bg-[#111] border border-[#333] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-400 w-56"
                />
                <button className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold px-5 py-2.5 rounded-xl text-sm transition">
                  Ban User
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* How they got in */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-3">How they got in</p>
          {inviter ? (
            <div>
              <p className="text-white font-bold">Invited by <Link href={`/users/${usedCode?.created_by}`} className="text-[#e378ac] hover:underline">@{inviter.username}</Link></p>
              <p className="text-gray-500 text-sm mt-1">Code used: <span className="font-mono text-gray-400">{usedCode?.code}</span></p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Joined directly (admin code or open signup)</p>
          )}
        </div>

        {/* Stats */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-3">Stats</p>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-2xl font-black text-[#e378ac]">{posts?.length ?? 0}</p>
              <p className="text-gray-600 text-xs">Public posts</p>
            </div>
            <div>
              <p className="text-2xl font-black text-purple-400">{invitedUsers?.length ?? 0}</p>
              <p className="text-gray-600 text-xs">Invited</p>
            </div>
          </div>
        </div>
      </div>

      {/* Invite codes */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-gray-500 text-xs uppercase tracking-wide">
            Invite Codes — {unusedCodes.length} unused of {userCodes?.length ?? 0}
          </p>
          <div className="flex gap-2">
            <form action={giveUserCodes.bind(null, id, 3)}>
              <button className="bg-[#e378ac]/10 hover:bg-[#e378ac]/20 text-[#e378ac] border border-[#e378ac]/20 text-xs font-bold px-3 py-1.5 rounded-xl transition">
                + Give 3 codes
              </button>
            </form>
            <form action={giveUserCodes.bind(null, id, 7)}>
              <button className="bg-[#e378ac] hover:bg-[#c0547a] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition">
                + Give 7 codes
              </button>
            </form>
          </div>
        </div>
        {unusedCodes.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {unusedCodes.map(c => (
              <span key={c.code} className="font-mono text-sm text-gray-300 bg-black/30 px-3 py-1 rounded-lg">
                {c.code}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-sm">No unused codes — use the buttons above to give them more</p>
        )}
      </div>

      {/* People they invited */}
      {invitedProfiles && invitedProfiles.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 mb-6">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-3">People they invited ({invitedProfiles.length})</p>
          <div className="flex flex-wrap gap-2">
            {invitedProfiles.map(p => (
              <Link
                key={p.id}
                href={`/users/${p.id}`}
                className={`text-sm px-3 py-1.5 rounded-xl border transition ${
                  p.banned
                    ? "bg-red-500/5 text-red-400/60 border-red-500/20"
                    : "bg-[#e378ac]/5 text-[#e378ac] border-[#e378ac]/20 hover:bg-[#e378ac]/10"
                }`}
              >
                @{p.username} {p.banned && "(banned)"}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Posts */}
      <div>
        <p className="text-gray-500 text-xs uppercase tracking-wide mb-3">Public Posts ({posts?.length ?? 0})</p>
        <div className="flex flex-col gap-3">
          {posts?.map(post => (
            <div key={post.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {post.is_anonymous && (
                      <span className="bg-purple-400/10 text-purple-400 text-xs font-bold px-2 py-0.5 rounded-full">anon</span>
                    )}
                    {post.category && (
                      <span className="bg-[#e378ac]/10 text-[#e378ac] text-xs font-semibold px-2 py-0.5 rounded-full">{post.category}</span>
                    )}
                    <span className="text-gray-600 text-xs">{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                  {post.content && <p className="text-gray-300 text-sm leading-relaxed">{post.content}</p>}
                  {post.image_url && (
                    <p className="text-gray-600 text-xs mt-1">📎 Has image</p>
                  )}
                  <div className="flex gap-4 mt-2 text-xs text-gray-600">
                    <span>❤️ {likeMap[post.id] ?? 0}</span>
                    <span>💬 {replyMap[post.id] ?? 0}</span>
                  </div>
                </div>
                <form action={deletePost.bind(null, post.id, id)}>
                  <button className="text-red-400/40 hover:text-red-400 text-xs font-bold transition shrink-0">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
          {posts?.length === 0 && (
            <p className="text-gray-600 text-sm">No posts yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
