import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { isAdminAuthed } from "@/lib/auth"

function resend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { to, subject, body } = await req.json()
  if (!to || !subject || !body) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  try {
    await resend().emails.send({
      from: "Haven <noreply@gethavenapp.xyz>",
      replyTo: "havenapp2026@gmail.com",
      to,
      subject,
      html: `
        <div style="background:#0f0f0f;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <div style="max-width:560px;margin:0 auto;">
            <p style="font-size:36px;font-weight:900;color:#e378ac;font-family:'Arial Rounded MT Bold','Nunito','Varela Round',Arial,sans-serif;margin:0 0 32px;">haven</p>
            <div style="background:#1a1a1a;border-radius:20px;padding:32px;border:1px solid #2a2a2a;">
              <div style="font-size:15px;color:#ccc;line-height:1.8;white-space:pre-wrap;">${body.replace(/\n/g, "<br/>")}</div>
              <p style="margin:28px 0 0;font-size:14px;color:#666;">
                — The Haven Team<br/>
                <a href="mailto:havenapp2026@gmail.com" style="color:#e378ac;">havenapp2026@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("Send email error:", e)
    return NextResponse.json({ error: "Failed to send" }, { status: 500 })
  }
}
