import DMUserModal from "@/components/DMUserModal"
import PostsCarousel from "@/components/PostsCarousel"
import SendEmailModal from "@/components/SendEmailModal"
import SuspendModal from "@/components/SuspendModal"
import { fmtDate, fmtDateTime, fmtTime, getAdminTZ } from "@/lib/date"
import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import Link from "next/link"
import { notFound } from "next/navigation"

const parseImageUrls = (raw: string | null): string[] => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((u: unknown) => typeof u === "string" && (u as string).startsWith("http"))
    if ((parsed as any)?._type === "text-card") return []
  } catch {}
  return raw.startsWith("http") ? [raw] : []
}

async function banUser(userId: string, reason: string) {
  "use server"
  await Promise.all([
    supabase.from("profiles").update({
      banned: true,
      ban_reason: reason,
      banned_at: new Date().toISOString(),
    }).eq("id", userId),
    // Revoke all unused invite codes so they can't be shared or used post-ban
    supabase.from("invite_codes").delete().eq("created_by", userId).is("used_at", null),
  ])
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

async function suspendUser(userId: string, suspendedUntil: string, reason: string) {
  "use server"
  await supabase.from("profiles").update({
    suspended_until: suspendedUntil,
    suspension_reason: reason,
  }).eq("id", userId)
  const hours = Math.ceil((new Date(suspendedUntil).getTime() - Date.now()) / (1000 * 60 * 60))
  await supabase.auth.admin.updateUserById(userId, { ban_duration: `${hours}h` })
  revalidatePath(`/users/${userId}`)
  revalidatePath("/users")
}

async function unsuspendUser(userId: string) {
  "use server"
  await supabase.from("profiles").update({
    suspended_until: null,
    suspension_reason: null,
  }).eq("id", userId)
  await supabase.auth.admin.updateUserById(userId, { ban_duration: "none" })
  revalidatePath(`/users/${userId}`)
  revalidatePath("/users")
}

async function setBadge(userId: string, field: "is_verified" | "is_ambassador", value: boolean) {
  "use server"
  await supabase.from("profiles").update({ [field]: value }).eq("id", userId)
  revalidatePath(`/users/${userId}`)
}

async function dmUser(targetUserId: string, message: string): Promise<{ error?: string }> {
  "use server"
  // Look up the havenofficial account to send as
  const { data: sender } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", "havenofficial")
    .single()

  if (!sender) return { error: "havenofficial account not found in database." }

  const senderId = sender.id

  // Find or create conversation between havenofficial and target
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .or(
      `and(user1_id.eq.${senderId},user2_id.eq.${targetUserId}),` +
      `and(user1_id.eq.${targetUserId},user2_id.eq.${senderId})`
    )
    .maybeSingle()

  let conversationId = existing?.id

  if (!conversationId) {
    const { data: created, error: createErr } = await supabase
      .from("conversations")
      .insert({ user1_id: senderId, user2_id: targetUserId, last_message_at: new Date().toISOString() })
      .select("id")
      .single()
    if (createErr || !created) return { error: "Failed to create conversation." }
    conversationId = created.id
  }

  // Insert the message
  const { error: msgErr } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id:       senderId,
    content:         message,
  })
  if (msgErr) return { error: "Failed to send message." }

  const preview = message.length > 60 ? message.slice(0, 60) + "…" : message

  // Update conversation preview + timestamp
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString(), last_message_text: preview })
    .eq("id", conversationId)

  return {}
}

async function deletePost(postId: string, userId: string) {
  "use server"
  await supabase.from("posts").delete().eq("id", postId)
  revalidatePath(`/users/${userId}`)
  revalidatePath("/users")
}

async function deleteUserAccount(userId: string) {
  "use server"
  // Delete unused invite codes first (used codes keep their referential history)
  await supabase.from("invite_codes").delete().eq("created_by", userId).is("used_by", null)
  // Delete profile + all DB data (posts, follows, etc. cascade via FK)
  await supabase.from("profiles").delete().eq("id", userId)
  // Revoke the auth account — immediately invalidates all active sessions
  await supabase.auth.admin.deleteUser(userId)
  revalidatePath("/users")
}

async function giveUserCodes(userId: string, count: number) {
  "use server"
  const CHARS = "ABCDEFGHJKLMNPQRTUVWXYZ2346789"
  const randomCode = () => {
    const bytes = new Uint8Array(8)
    crypto.getRandomValues(bytes)
    let code = ""
    for (let i = 0; i < 8; i++) {
      if (i === 4) code += "-"
      code += CHARS[bytes[i] % CHARS.length]
    }
    return code
  }
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const rows = Array.from({ length: count }, () => ({ code: randomCode(), created_by: userId, expires_at: expiresAt }))
  await supabase.from("invite_codes").insert(rows)
  revalidatePath(`/users/${userId}`)
}

export default async function UserDetail({ params }: { params: { id: string } }) {
  const { id } = params
  const tz = await getAdminTZ()

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
    ? await supabase.from("profiles").select("id, username, banned, created_at").in("id", invitedIds)
    : { data: [] as { id: string; username: string; banned: boolean; created_at: string }[] }

  // Merge code + join date into each invited profile
  const invitedList = (invitedUsers ?? []).map(inv => {
    const profile = invitedProfiles?.find(p => p.id === inv.used_by)
    return profile ? { ...profile, code: inv.code as string, usedAt: inv.used_at as string | null } : null
  }).filter(Boolean) as { id: string; username: string; banned: boolean; created_at: string; code: string; usedAt: string | null }[]

  // Get their public posts only — anonymous posts are private to the user
  const { data: posts } = await supabase
    .from("posts")
    .select("id, content, image_url, is_anonymous, category, created_at")
    .eq("user_id", id)
    .eq("is_anonymous", false)
    .order("created_at", { ascending: false })

  // Get all their codes + full history
  const { data: userCodes } = await supabase
    .from("invite_codes")
    .select("code, used_by, used_at, expires_at, created_at")
    .eq("created_by", id)
    .order("created_at", { ascending: false })

  const now = new Date()
  const unusedCodes   = (userCodes ?? []).filter(c => !c.used_by && (!c.expires_at || new Date(c.expires_at) > now))
  const usedCodes     = (userCodes ?? []).filter(c => !!c.used_by)
  const expiredCodes  = (userCodes ?? []).filter(c => !c.used_by && c.expires_at && new Date(c.expires_at) <= now)

  // Get their code requests history
  const { data: codeRequests } = await supabase
    .from("code_requests")
    .select("status, requested_count, requested_at, approved_at, reject_reason")
    .eq("user_id", id)
    .order("requested_at", { ascending: false })

  // Get follower / following counts
  const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", id),
    supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", id),
  ])

  // Check if they came via waitlist approval
  const { data: waitlistEntry } = user.email
    ? await supabase
        .from("waitlist")
        .select("email, created_at")
        .ilike("email", user.email)
        .eq("status", "approved")
        .maybeSingle()
    : { data: null }

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

  // Scoped delete action — bound to this user's page revalidation
  const deleteUserPost = async (postId: string) => {
    "use server"
    await supabase.from("posts").delete().eq("id", postId)
    revalidatePath(`/users/${id}`)
    revalidatePath("/users")
  }

  const deleteInviteCode = async (code: string) => {
    "use server"
    await supabase.from("invite_codes").delete().eq("code", code)
    revalidatePath(`/users/${id}`)
  }

  const carouselPosts = (posts ?? []).map(p => ({
    ...p,
    imageUrls: parseImageUrls(p.image_url),
  }))

  const INTEREST_MAP: Record<string, { label: string; emoji: string }> = {
    fashion:       { label: "Fashion & Style",  emoji: "👗" },
    music:         { label: "Music",             emoji: "🎵" },
    gaming:        { label: "Gaming",            emoji: "🎮" },
    fitness:       { label: "Fitness",           emoji: "💪" },
    mental_health: { label: "Mental Health",     emoji: "🧠" },
    food:          { label: "Food & Cooking",    emoji: "🍜" },
    travel:        { label: "Travel",            emoji: "✈️" },
    art:           { label: "Art & Creativity",  emoji: "🎨" },
    sports:        { label: "Sports",            emoji: "⚽" },
    tech:          { label: "Tech",              emoji: "💻" },
    books:         { label: "Books",             emoji: "📚" },
    film:          { label: "Film & TV",         emoji: "🎬" },
    beauty:        { label: "Beauty",            emoji: "💄" },
    relationships: { label: "Relationships",     emoji: "💕" },
    photography:   { label: "Photography",       emoji: "📸" },
    nature:        { label: "Nature",            emoji: "🌿" },
  }

  const interests: string[] = Array.isArray(user.interests) ? user.interests : []

  const age = user.date_of_birth
    ? Math.floor((Date.now() - new Date(user.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

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
              {!user.banned && user.suspended_until && new Date(user.suspended_until) > new Date() && (
                <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-xs font-bold px-2 py-1 rounded-full">
                  SUSPENDED
                </span>
              )}
            </div>
            {user.display_name && <p className="text-gray-400 mb-1">{user.display_name}</p>}
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[#e378ac] text-sm">{user.email}</p>
              {user.email && (
                <SendEmailModal
                  to={user.email}
                  username={user.username ?? "there"}
                  defaultSubject="Your Haven account"
                  defaultBody={`Hi @${user.username ?? "there"},\n\nWe're reaching out regarding your Haven account.\n\nThe Haven Team`}
                />
              )}
            </div>
            <p className="text-gray-600 text-xs">
              Joined {fmtDate(user.created_at, tz)}
            </p>
            {user.banned && user.ban_reason && (
              <p className="text-red-400/70 text-xs mt-2">Ban reason: {user.ban_reason}</p>
            )}
          </div>

          {/* Suspend / Ban / DM */}
          <div className="shrink-0 flex flex-col gap-3">
            {/* DM User */}
            <DMUserModal
              username={user.username ?? "user"}
              sendAction={dmUser.bind(null, id)}
            />

            {/* Badge toggles */}
            <div className="flex gap-2">
              <form action={setBadge.bind(null, id, "is_verified", !user.is_verified)}>
                <button className={`flex items-center gap-1.5 font-bold px-3 py-2 rounded-xl text-xs transition border ${
                  user.is_verified
                    ? "bg-[#e378ac]/20 text-[#e378ac] border-[#e378ac]/40 hover:bg-[#e378ac]/10"
                    : "bg-white/5 text-gray-400 border-white/10 hover:text-[#e378ac] hover:border-[#e378ac]/30"
                }`}>
                  ✓ {user.is_verified ? "Verified" : "Verify"}
                </button>
              </form>
              <form action={setBadge.bind(null, id, "is_ambassador", !user.is_ambassador)}>
                <button className={`flex items-center gap-1.5 font-bold px-3 py-2 rounded-xl text-xs transition border ${
                  user.is_ambassador
                    ? "bg-[#e378ac]/20 text-[#e378ac] border-[#e378ac]/40 hover:bg-[#e378ac]/10"
                    : "bg-white/5 text-gray-400 border-white/10 hover:text-[#e378ac] hover:border-[#e378ac]/30"
                }`}>
                  ★ {user.is_ambassador ? "Ambassador" : "Make Ambassador"}
                </button>
              </form>
            </div>

            {/* Suspend */}
            {!user.banned && (
              <SuspendModal
                userId={id}
                username={user.username ?? "user"}
                email={user.email ?? null}
                suspendedUntil={user.suspended_until ?? null}
                suspendAction={suspendUser}
                unsuspendAction={unsuspendUser}
              />
            )}

            {/* Ban / Unban */}
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
            {/* Delete account */}
            <form action={async () => {
              "use server"
              await deleteUserAccount(id)
            }}>
              <button className="bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/40 font-bold px-5 py-2.5 rounded-xl text-sm transition w-full">
                Delete Account
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* How they got in */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-3">How they got in</p>
          {inviter ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-400 mb-1">🔗 Invited by a user</p>
              <p className="text-white font-bold">
                <Link href={`/users/${usedCode?.created_by}`} className="text-[#e378ac] hover:underline">@{inviter.username}</Link>
                {" "}invited them
              </p>
              <p className="text-gray-500 text-sm mt-1">Code: <span className="font-mono text-gray-400">{usedCode?.code}</span></p>
            </div>
          ) : waitlistEntry ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-400 mb-1">🕊️ Via Waitlist</p>
              <p className="text-white font-bold">Applied & approved through the waitlist</p>
              <p className="text-gray-500 text-sm mt-1">
                Applied {fmtDate(waitlistEntry.created_at, tz)}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#e378ac] mb-1">✦ Direct</p>
              <p className="text-white font-bold">Got a code directly from you</p>
              <p className="text-gray-500 text-sm mt-1">No waitlist entry — admin issued this code</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-3">Stats</p>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-2xl font-black text-[#e378ac]">{posts?.length ?? 0}</p>
              <p className="text-gray-600 text-xs">Public posts</p>
            </div>
            <div>
              <p className="text-2xl font-black text-purple-400">{invitedUsers?.length ?? 0}</p>
              <p className="text-gray-600 text-xs">Invited</p>
            </div>
            <div>
              <p className="text-2xl font-black text-blue-400">{followerCount ?? 0}</p>
              <p className="text-gray-600 text-xs">Followers</p>
            </div>
            <div>
              <p className="text-2xl font-black text-teal-400">{followingCount ?? 0}</p>
              <p className="text-gray-600 text-xs">Following</p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 mb-6">
        <p className="text-gray-500 text-xs uppercase tracking-wide mb-4">Profile Details</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Student */}
          <div>
            <p className="text-gray-600 text-xs mb-1">Student</p>
            {user.is_student === true && <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm font-bold px-3 py-1 rounded-full">🎓 Yes</span>}
            {user.is_student === false && <span className="bg-[#2a2a2a] text-gray-400 border border-[#333] text-sm font-bold px-3 py-1 rounded-full">No</span>}
            {user.is_student === null || user.is_student === undefined ? <span className="text-gray-600 text-sm">Not answered</span> : null}
          </div>
          {/* School */}
          <div>
            <p className="text-gray-600 text-xs mb-1">School</p>
            {user.school
              ? <span className="text-white text-sm font-semibold">🏫 {user.school}</span>
              : <span className="text-gray-600 text-sm">Not provided</span>
            }
          </div>
          {/* Age */}
          <div>
            <p className="text-gray-600 text-xs mb-1">Age</p>
            {age !== null
              ? <span className="text-white font-bold">{age} years old</span>
              : <span className="text-gray-600 text-sm">Not provided</span>
            }
          </div>
          {/* Location */}
          <div>
            <p className="text-gray-600 text-xs mb-1">Location</p>
            {user.location
              ? <span className="text-white text-sm">📍 {user.location}</span>
              : <span className="text-gray-600 text-sm">Not provided</span>
            }
          </div>
          {/* Streaks */}
          <div>
            <p className="text-gray-600 text-xs mb-1">Daily Streak</p>
            <div className="flex flex-col gap-1">
              {user.current_streak > 0
                ? <span className="text-orange-400 font-bold">🔥 {user.current_streak} day{user.current_streak !== 1 ? "s" : ""} current</span>
                : <span className="text-gray-600 text-sm">No active streak</span>
              }
              {user.longest_streak > 0 && (
                <span className="text-yellow-500/80 text-xs font-semibold">🏆 {user.longest_streak} day{user.longest_streak !== 1 ? "s" : ""} best</span>
              )}
            </div>
          </div>
          {/* Last Seen */}
          <div className="col-span-2">
            <p className="text-gray-600 text-xs mb-1">Last Seen</p>
            {user.last_seen_at
              ? <span className="text-gray-300 text-sm">
                  {fmtDate(user.last_seen_at, tz)} · {fmtTime(user.last_seen_at, tz)}
                </span>
              : <span className="text-gray-600 text-sm">Never recorded</span>
            }
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <div className="mb-4">
            <p className="text-gray-600 text-xs mb-1">Bio</p>
            <p className="text-gray-300 text-sm leading-relaxed">{user.bio}</p>
          </div>
        )}

        {/* Interests */}
        <div>
          <p className="text-gray-600 text-xs mb-2">Interests</p>
          {interests.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {interests.map(id => {
                const interest = INTEREST_MAP[id]
                return interest ? (
                  <span key={id} className="bg-[#e378ac]/10 text-[#e378ac] border border-[#e378ac]/20 text-xs font-semibold px-3 py-1.5 rounded-full">
                    {interest.emoji} {interest.label}
                  </span>
                ) : null
              })}
            </div>
          ) : (
            <span className="text-gray-600 text-sm">None selected</span>
          )}
        </div>
      </div>

      {/* Invite code history */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Invite Codes</p>
            <div className="flex gap-4 text-xs">
              <span><span className="text-white font-bold">{unusedCodes.length}</span> <span className="text-gray-500">active</span></span>
              <span><span className="text-[#e378ac] font-bold">{usedCodes.length}</span> <span className="text-gray-500">used</span></span>
              <span><span className="text-gray-500 font-bold">{expiredCodes.length}</span> <span className="text-gray-500">expired</span></span>
              <span><span className="text-white font-bold">{userCodes?.length ?? 0}</span> <span className="text-gray-500">total</span></span>
            </div>
          </div>
          <div className="flex gap-2">
            <form action={giveUserCodes.bind(null, id, 3)}>
              <button className="bg-[#e378ac]/10 hover:bg-[#e378ac]/20 text-[#e378ac] border border-[#e378ac]/20 text-xs font-bold px-3 py-1.5 rounded-xl transition">
                + Give 3
              </button>
            </form>
            <form action={giveUserCodes.bind(null, id, 7)}>
              <button className="bg-[#e378ac] hover:bg-[#c0547a] text-white text-xs font-bold px-3 py-1.5 rounded-xl transition">
                + Give 7
              </button>
            </form>
          </div>
        </div>

        {(userCodes?.length ?? 0) === 0 ? (
          <p className="px-5 py-6 text-gray-600 text-sm">No codes yet — use the buttons above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-600 text-xs uppercase tracking-wide border-b border-[#2a2a2a]">
                <th className="text-left px-5 py-3">Code</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Issued</th>
                <th className="text-left px-5 py-3">Used / Expires</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(userCodes ?? []).map((c, i) => {
                const isUsed    = !!c.used_by
                const isExpired = !c.used_by && c.expires_at && new Date(c.expires_at) <= now
                const daysLeft  = !isUsed && !isExpired && c.expires_at
                  ? Math.ceil((new Date(c.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                  : null
                const expiringSoon = daysLeft !== null && daysLeft <= 7
                return (
                  <tr key={c.code} className={`border-b border-[#1f1f1f] ${isExpired ? "bg-orange-500/[0.04]" : i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                    <td className="px-5 py-3">
                      <span className={`font-mono text-sm ${isUsed ? "text-gray-600" : isExpired ? "text-orange-400/60" : "text-gray-300"}`}>
                        {c.code}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {isUsed ? (
                        <span className="bg-green-400/10 text-green-400 text-xs font-bold px-2 py-0.5 rounded-full">Used</span>
                      ) : isExpired ? (
                        <span className="bg-orange-500/20 text-orange-400 text-xs font-bold px-2 py-0.5 rounded-full">⚠ Expired</span>
                      ) : expiringSoon ? (
                        <span className="bg-yellow-500/10 text-yellow-400 text-xs font-bold px-2 py-0.5 rounded-full">⚠ {daysLeft}d left</span>
                      ) : (
                        <span className="bg-[#e378ac]/10 text-[#e378ac] text-xs font-bold px-2 py-0.5 rounded-full">
                          Active · {daysLeft !== null ? `${daysLeft}d` : "No expiry"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {c.created_at ? fmtDate(c.created_at, tz) : "—"}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {isUsed && c.used_at ? (
                        <span className="text-gray-500">Used {fmtDate(c.used_at, tz)}</span>
                      ) : isExpired && c.expires_at ? (
                        <span className="text-orange-400 font-semibold">Expired {fmtDate(c.expires_at, tz)}</span>
                      ) : c.expires_at ? (
                        <span className={expiringSoon ? "text-yellow-400 font-semibold" : "text-gray-500"}>
                          Exp {fmtDate(c.expires_at, tz)}
                        </span>
                      ) : (
                        <span className="text-gray-600 italic">No expiry set</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {!isUsed && (
                        <form action={deleteInviteCode.bind(null, c.code)}>
                          <button className="text-red-400/60 hover:text-red-400 text-xs font-bold px-2 py-1 rounded-lg hover:bg-red-500/10 transition">
                            Delete
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Code request history */}
      {(codeRequests?.length ?? 0) > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-[#2a2a2a]">
            <p className="text-gray-500 text-xs uppercase tracking-wide">Code Request History · {codeRequests!.length}</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-600 text-xs uppercase tracking-wide border-b border-[#2a2a2a]">
                <th className="text-left px-5 py-3">Requested</th>
                <th className="text-left px-5 py-3">Count</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {codeRequests!.map((r, i) => {
                const STATUS_STYLE: Record<string, string> = {
                  pending:  "bg-yellow-400/10 text-yellow-400",
                  approved: "bg-green-400/10 text-green-400",
                  rejected: "bg-red-400/10 text-red-400",
                }
                return (
                  <tr key={i} className={`border-b border-[#1f1f1f] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                    <td className="px-5 py-3 text-gray-400">
                      {fmtDate(r.requested_at, tz)}
                    </td>
                    <td className="px-5 py-3 text-white font-bold">{r.requested_count ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status] ?? "bg-white/5 text-gray-400"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {r.reject_reason ?? (r.approved_at ? `Approved ${fmtDate(r.approved_at, tz)}` : "—")}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* People they invited */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-[#2a2a2a]">
          <p className="text-gray-500 text-xs uppercase tracking-wide">
            People they invited · <span className="text-white font-bold">{invitedList.length}</span>
          </p>
        </div>
        {invitedList.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-600 text-xs uppercase tracking-wide border-b border-[#2a2a2a]">
                <th className="text-left px-5 py-3">User</th>
                <th className="text-left px-5 py-3">Code used</th>
                <th className="text-left px-5 py-3">Joined</th>
                <th className="text-left px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {invitedList.map((p, i) => (
                <tr key={p.id} className={`border-b border-[#1f1f1f] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                  <td className="px-5 py-3">
                    <Link href={`/users/${p.id}`} className="text-[#e378ac] hover:underline font-bold">
                      @{p.username}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-gray-400 bg-black/30 px-2 py-1 rounded-lg">{p.code}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-400">
                    {fmtDate(p.usedAt ?? p.created_at, tz)}
                  </td>
                  <td className="px-5 py-3">
                    {p.banned
                      ? <span className="bg-red-500/10 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">Banned</span>
                      : <span className="bg-green-400/10 text-green-400 text-xs font-bold px-2 py-0.5 rounded-full">Active</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-6 text-gray-600 text-sm">No one has used their codes yet.</p>
        )}
      </div>

      {/* Posts carousel */}
      <PostsCarousel
        posts={carouselPosts}
        likeMap={likeMap}
        replyMap={replyMap}
        deleteAction={deleteUserPost}
      />
    </div>
  )
}
