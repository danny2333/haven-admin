import { sendReengagementEmail } from "@/lib/email"
import { isWebhookAuthed } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

// Called by the notify_inactive_users() pg_cron job (runs nightly).
export async function POST(req: NextRequest) {
  if (!isWebhookAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { email, name, user_id } = await req.json()

    if (!email || !user_id) {
      return NextResponse.json({ error: "Missing email or user_id" }, { status: 400 })
    }

    await sendReengagementEmail({ to: email, name: name || "there", userId: user_id })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error("reengagement-email error:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
