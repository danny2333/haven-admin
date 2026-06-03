import { sendWaitlistConfirmationEmail } from "@/lib/email"
import { NextRequest, NextResponse } from "next/server"

// Called by a Supabase Database Webhook on INSERT to the waitlist table.
// Setup in Supabase Dashboard → Database → Webhooks → Create new webhook:
//   Table: waitlist | Event: INSERT | URL: https://your-admin-url/api/waitlist-confirm
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Supabase webhooks send the new row inside body.record
    const record = body.record ?? body

    const { email, name } = record

    if (!email) {
      return NextResponse.json({ error: "No email in payload" }, { status: 400 })
    }

    await sendWaitlistConfirmationEmail({ to: email, name: name || "there" })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error("waitlist-confirm error:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
