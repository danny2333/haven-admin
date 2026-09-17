import { NextRequest, NextResponse } from "next/server"
import { sendCodeRequestRejectedEmail } from "@/lib/email"
import { supabase } from "@/lib/supabase"
import { isAdminAuthed } from "@/lib/auth"

export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { requestId, userId, email, username, reason } = await req.json()
  console.log("reject-request:", { requestId, userId, email, username })

  const [codeRes, notifRes] = await Promise.all([
    supabase.from("code_requests").update({
      status: "rejected",
      reject_reason: reason,
    }).eq("id", requestId),
    supabase.from("notifications").insert({
      user_id: userId,
      type: "code_request_rejected",
      from_user_id: null,
      post_id: null,
      community_id: null,
    }),
  ])

  if (codeRes.error) console.error("code_requests update error:", codeRes.error)
  if (notifRes.error) console.error("notifications insert error:", notifRes.error)

  // Fetch push token
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("push_token")
    .eq("id", userId)
    .single()

  if (profileErr) console.error("profile fetch error:", profileErr)
  console.log("push_token:", profile?.push_token)

  // Send push notification
  if (profile?.push_token) {
    const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        to: profile.push_token,
        title: "Code request update",
        body: "Your request for more invite codes wasn't approved. Tap to see why.",
        data: { type: "code_request_rejected" },
        sound: "default",
        priority: "high",
      }),
    })
    const pushData = await pushRes.json()
    console.log("push result:", JSON.stringify(pushData))
  }

  if (email) {
    await sendCodeRequestRejectedEmail({ to: email, username: username ?? "there", reason })
  }

  return NextResponse.json({ ok: true })
}
