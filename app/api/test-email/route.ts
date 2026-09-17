import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { isAdminAuthed } from "@/lib/auth"

export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY env var missing" }, { status: 500 })
  }

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: "Haven <noreply@gethavenapp.xyz>",
      replyTo: "havenapp2026@gmail.com",
      to: "havenapp2026@gmail.com",
      subject: "Haven admin email test",
      html: "<p>If you receive this, Resend is working correctly.</p>",
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
