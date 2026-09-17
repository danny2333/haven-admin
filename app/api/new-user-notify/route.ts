import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = () => new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = "havenapp2026@gmail.com"

export async function POST(req: NextRequest) {
  // Verify webhook secret so only Supabase can call this
  const secret = req.headers.get("x-webhook-secret")
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const record = body?.record
  if (!record) return NextResponse.json({ ok: true })

  const username = record.username ?? "unknown"
  const email    = record.email    ?? "—"
  const joinedAt = record.created_at
    ? new Date(record.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "—"

  await resend().emails.send({
    from:    "Haven <noreply@gethavenapp.xyz>",
    to:      ADMIN_EMAIL,
    subject: `🌸 New member joined — @${username}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

        <tr><td align="center" style="padding-bottom:24px;">
          <p style="margin:0;font-size:36px;font-weight:900;color:#e378ac;font-family:'Arial Rounded MT Bold','Nunito','Varela Round',Arial,sans-serif;">haven</p>
        </td></tr>

        <tr><td style="background:#1a1a1a;border-radius:20px;padding:32px;border:1px solid #2a2a2a;">
          <p style="margin:0 0 6px;font-size:22px;font-weight:900;color:#fff;">New member joined 🌸</p>
          <p style="margin:0 0 24px;font-size:14px;color:#888;">${joinedAt}</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #2a2a2a;border-radius:14px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 10px;font-size:14px;color:#888;">
                <strong style="color:#e378ac;">Username:</strong> @${username}
              </p>
              <p style="margin:0;font-size:14px;color:#888;">
                <strong style="color:#fff;">Email:</strong> ${email}
              </p>
            </td></tr>
          </table>

          <a href="https://haven-admin.vercel.app/users" style="display:inline-block;background:#e378ac;color:#fff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:12px;text-decoration:none;">
            View in Admin →
          </a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })

  return NextResponse.json({ ok: true })
}
