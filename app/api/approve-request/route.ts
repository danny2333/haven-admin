import { NextRequest, NextResponse } from "next/server"
import { sendCodeRequestApprovedEmail } from "@/lib/email"
import { supabase } from "@/lib/supabase"
import { isAdminAuthed } from "@/lib/auth"

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

export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { requestId, userId, email, username, codesCount = 5 } = await req.json()
  const count = Math.max(1, Math.min(100, parseInt(codesCount) || 5))
  console.log("[approve-request] requestId:", requestId, "codesCount received:", codesCount, "count computed:", count)

  // Idempotency guard — if already approved, skip code generation
  const { data: existing } = await supabase
    .from("code_requests")
    .select("status")
    .eq("id", requestId)
    .single()
  if (existing?.status === "approved") {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  await Promise.all([
    supabase.from("code_requests").update({ status: "approved", approved_at: new Date().toISOString(), approved_count: count }).eq("id", requestId),
    supabase.from("invite_codes").insert(
      Array.from({ length: count }, () => ({ code: randomCode(), created_by: userId, expires_at: expiresAt }))
    ),
  ])

  const { error: notifError } = await supabase.from("notifications").insert({
    user_id: userId,
    type: "code_request_approved",
    from_user_id: null,
    post_id: null,
    community_id: null,
    moodboard_id: null,
    community_post_id: null,
  })
  if (notifError) console.error("[approve-request] notification insert failed:", notifError.message, notifError.details)

  // Send push notification
  const { data: profile } = await supabase.from("profiles").select("push_token").eq("id", userId).single()
  if (profile?.push_token) {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        to: profile.push_token,
        title: "Code request approved 🎉",
        body: `Your request was approved — ${count} new invite code${count !== 1 ? "s" : ""} added to your profile.`,
        data: { type: "code_request_approved" },
        sound: "default",
        priority: "high",
      }),
    })
  }

  if (email) {
    await sendCodeRequestApprovedEmail({ to: email, username: username ?? "there", codesCount: count })
  }

  return NextResponse.json({ ok: true })
}
