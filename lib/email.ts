import { Resend } from "resend"

const FROM = "Haven <noreply@gethavenapp.xyz>"
const REPLY_TO = "havenapp2026@gmail.com"

function resend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendWaitlistConfirmationEmail({
  to,
  name,
}: {
  to: string
  name: string
}) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <tr>
            <td align="center" style="padding-bottom:32px;">
              <p style="margin:0;font-size:36px;font-style:italic;font-weight:900;color:#e378ac;letter-spacing:-1px;font-family:Georgia,serif;">haven</p>
            </td>
          </tr>

          <tr>
            <td style="background:#1a1a1a;border-radius:24px;padding:40px;border:1px solid #2a2a2a;">

              <p style="margin:0 0 8px;font-size:26px;font-weight:900;color:#fff;letter-spacing:-0.5px;">
                Thank you for applying 🌸
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#888;">
                Hi ${name}, we've received your application.
              </p>

              <p style="margin:0 0 24px;font-size:15px;color:#bbb;line-height:1.8;">
                We appreciate your interest in Haven. Your application is currently under review by our team.
                We carefully vet every member to ensure Haven remains a safe, intentional space for women.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#e378ac12;border:1px solid #e378ac30;border-radius:16px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#e378ac;letter-spacing:1px;text-transform:uppercase;">What to expect</p>
                    <p style="margin:0;font-size:14px;color:#bbb;line-height:1.8;">
                      Applications are typically reviewed within <strong style="color:#fff;">7 days</strong>.
                      If approved, you will receive a follow-up email with your personal invite code and instructions to access the app.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:15px;color:#bbb;line-height:1.8;">
                In the meantime, you do not need to take any further action. We will be in touch shortly.
              </p>

              <p style="margin:0;font-size:15px;color:#888;line-height:1.7;">
                Thank you for your patience and for wanting to be a part of our community.
              </p>

              <p style="margin:24px 0 0;font-size:15px;color:#888;">
                Warm regards,<br />
                <strong style="color:#e378ac;">The Haven Team</strong>
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#444;line-height:1.6;">
                You're receiving this because you submitted an application to join Haven.<br />
                If this wasn't you, you can safely disregard this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  await resend().emails.send({ from: FROM, replyTo: REPLY_TO, to, subject: "We've received your application — Haven", html })
}

export async function sendApprovalEmail({
  to,
  name,
  code,
}: {
  to: string
  name: string
  code: string
}) {
  const formattedCode = code.includes("-") ? code : `${code.slice(0, 4)}-${code.slice(4)}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <tr>
            <td align="center" style="padding-bottom:32px;">
              <p style="margin:0;font-size:36px;font-style:italic;font-weight:900;color:#e378ac;letter-spacing:-1px;font-family:Georgia,serif;">
                haven
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#1a1a1a;border-radius:24px;padding:40px;border:1px solid #2a2a2a;">

              <p style="margin:0 0 8px;font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.5px;">
                You're in 🌸
              </p>
              <p style="margin:0 0 28px;font-size:16px;color:#888;line-height:1.6;">
                Hi ${name}, welcome to Haven.
              </p>

              <p style="margin:0 0 24px;font-size:15px;color:#bbb;line-height:1.7;">
                Haven is a safe, women-only space to be real — share your thoughts, your wins, your hard days, without the pressure of performing for anyone. We're so glad you're here.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#0f0f0f;border:1.5px solid #e378ac;border-radius:16px;padding:24px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#e378ac;letter-spacing:2px;text-transform:uppercase;">
                      Your invite code
                    </p>
                    <p style="margin:0;font-size:32px;font-weight:900;color:#fff;letter-spacing:6px;font-family:monospace;">
                      ${formattedCode}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#fff;">
                How to join:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr><td style="padding:4px 0;"><p style="margin:0;font-size:14px;color:#bbb;line-height:1.6;">1. Download the <strong style="color:#fff;">Haven</strong> app</p></td></tr>
                <tr><td style="padding:4px 0;"><p style="margin:0;font-size:14px;color:#bbb;line-height:1.6;">2. Tap <strong style="color:#fff;">"Have an invite code?"</strong> on the sign up screen</p></td></tr>
                <tr><td style="padding:4px 0;"><p style="margin:0;font-size:14px;color:#bbb;line-height:1.6;">3. Enter your code — <strong style="color:#fff;">${formattedCode}</strong></p></td></tr>
                <tr><td style="padding:4px 0;"><p style="margin:0;font-size:14px;color:#bbb;line-height:1.6;">4. Create your account and you're in ✨</p></td></tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td style="background:#0f0f0f;border:1px solid #2a2a2a;border-radius:12px;padding:20px 18px;">
                    <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#fff;">🎟️ You'll receive 7 invite codes when you join</p>
                    <p style="margin:0;font-size:13px;color:#aaa;line-height:1.7;">
                      Once you're in, you'll get 7 codes to share with people you trust. Haven is women-only — please be very careful who you give them to. The people you invite reflect on you, and their behaviour in the app is tied to your account.
                    </p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#ff444415;border:1px solid #ff444430;border-radius:12px;padding:16px 18px;">
                    <p style="margin:0;font-size:13px;color:#ff7070;line-height:1.7;">
                      ⚠️ <strong>Important:</strong> If you invite a man or someone who violates Haven's safety rules, <strong>both accounts may be permanently banned</strong>. Your codes are your responsibility — treat them seriously.
                    </p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#e378ac12;border:1px solid #e378ac30;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0;font-size:13px;color:#e378ac;line-height:1.6;">
                      🔒 Your personal invite code above is for you only — it can only be used once. Please don't share it publicly.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:15px;color:#888;line-height:1.7;">
                We can't wait to see you in there. Haven is growing slowly and intentionally — every person here was chosen. That includes you.
              </p>

              <p style="margin:24px 0 0;font-size:15px;color:#888;">
                With love,<br />
                <strong style="color:#e378ac;">The Haven Team</strong>
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#444;line-height:1.6;">
                You're receiving this because you applied to join Haven.<br />
                If this wasn't you, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  await resend().emails.send({ from: FROM, replyTo: REPLY_TO, to, subject: "You're in 🌸 Welcome to Haven", html })
}

export async function sendCodeRequestApprovedEmail({ to, username, codesCount }: { to: string; username: string; codesCount: number }) {
  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td align="center" style="padding-bottom:28px;">
          <p style="margin:0;font-size:32px;font-style:italic;font-weight:900;color:#e378ac;font-family:Georgia,serif;">haven</p>
        </td></tr>
        <tr><td style="background:#1a1a1a;border-radius:20px;padding:36px;border:1px solid #2a2a2a;">
          <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#fff;">You got more codes 🎟️</p>
          <p style="margin:0 0 24px;font-size:14px;color:#888;">Hi @${username}, your request was approved.</p>
          <p style="margin:0 0 24px;font-size:15px;color:#bbb;line-height:1.8;">
            We've added <strong style="color:#fff;">${codesCount} new invite codes</strong> to your account. Keep sharing Haven with people you trust — every person you bring in makes the community stronger.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#e378ac12;border:1px solid #e378ac30;border-radius:14px;margin-bottom:28px;">
            <tr><td style="padding:18px 22px;">
              <p style="margin:0;font-size:14px;color:#e378ac;line-height:1.8;">
                🌸 <strong>Keep promoting Haven.</strong> Share it on your socials, tell your friends, and help us grow the community intentionally. The people you invite are a reflection of you.
              </p>
            </td></tr>
          </table>
          <p style="margin:0;font-size:14px;color:#888;">Open the Haven app to find your new codes in your profile.</p>
          <p style="margin:24px 0 0;font-size:14px;color:#888;">With love,<br/><strong style="color:#e378ac;">The Haven Team</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  await resend().emails.send({ from: FROM, replyTo: REPLY_TO, to, subject: "Your code request was approved 🎟️", html })
}

export async function sendCodeRequestRejectedEmail({ to, username, reason }: { to: string; username: string; reason: string }) {
  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td align="center" style="padding-bottom:28px;">
          <p style="margin:0;font-size:32px;font-style:italic;font-weight:900;color:#e378ac;font-family:Georgia,serif;">haven</p>
        </td></tr>
        <tr><td style="background:#1a1a1a;border-radius:20px;padding:36px;border:1px solid #2a2a2a;">
          <p style="margin:0 0 8px;font-size:22px;font-weight:900;color:#fff;">Code request not approved</p>
          <p style="margin:0 0 24px;font-size:14px;color:#888;">Hi @${username},</p>
          <p style="margin:0 0 20px;font-size:15px;color:#bbb;line-height:1.8;">
            We reviewed your request for more invite codes and weren't able to approve it at this time.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #2a2a2a;border-radius:14px;margin-bottom:24px;">
            <tr><td style="padding:18px 22px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:1px;">Reason</p>
              <p style="margin:0;font-size:14px;color:#ccc;line-height:1.7;">${reason}</p>
            </td></tr>
          </table>
          <p style="margin:0 0 24px;font-size:15px;color:#bbb;line-height:1.8;">
            You're welcome to apply again in the future. Keep being an active part of the community and we'll be happy to revisit your request.
          </p>
          <p style="margin:0;font-size:14px;color:#888;">With love,<br/><strong style="color:#e378ac;">The Haven Team</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  await resend().emails.send({ from: FROM, replyTo: REPLY_TO, to, subject: "Your Haven code request", html })
}

export async function sendReengagementEmail({
  to,
  name,
  userId,
}: {
  to: string
  name: string
  userId: string
}) {
  const unsubscribeUrl = `https://haven-admin-three.vercel.app/api/unsubscribe-reengagement?user=${userId}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <tr>
            <td align="center" style="padding-bottom:32px;">
              <p style="margin:0;font-size:36px;font-style:italic;font-weight:900;color:#e378ac;letter-spacing:-1px;font-family:Georgia,serif;">haven</p>
            </td>
          </tr>

          <tr>
            <td style="background:#1a1a1a;border-radius:24px;padding:40px;border:1px solid #2a2a2a;">

              <p style="margin:0 0 8px;font-size:26px;font-weight:900;color:#fff;letter-spacing:-0.5px;">
                We've missed you 🌸
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#888;">
                Hi ${name}, it's been a little while.
              </p>

              <p style="margin:0 0 20px;font-size:15px;color:#bbb;line-height:1.8;">
                Your space on Haven is exactly how you left it — whenever you're ready to share what's on your mind, vent about your day, or just see what your community's been up to, we'll be here.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#e378ac12;border:1px solid #e378ac30;border-radius:16px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0;font-size:14px;color:#bbb;line-height:1.8;">
                      🌸 No pressure, no catching up required. Just open the app whenever you feel like it — good days and hard days both belong here.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:15px;color:#888;line-height:1.7;">
                We're glad you're part of this. Come say hi whenever you're ready.
              </p>

              <p style="margin:24px 0 0;font-size:15px;color:#888;">
                With love,<br />
                <strong style="color:#e378ac;">The Haven Team</strong>
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#444;line-height:1.6;">
                You're receiving this because it's been a while since you opened Haven.<br />
                <a href="${unsubscribeUrl}" style="color:#666;">Unsubscribe from these reminders</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  await resend().emails.send({ from: FROM, replyTo: REPLY_TO, to, subject: "We've missed you 🌸 — Haven", html })
}

export async function sendReportNotificationEmail({
  reason,
  reporterUsername,
  reportedUsername,
  isPostReport,
  postContent,
}: {
  reason: string
  reporterUsername: string
  reportedUsername: string
  isPostReport: boolean
  postContent?: string | null
}) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <p style="margin:0;font-size:32px;font-style:italic;font-weight:900;color:#e378ac;font-family:Georgia,serif;">haven</p>
            </td>
          </tr>
          <tr>
            <td style="background:#1a1a1a;border-radius:20px;padding:32px;border:1px solid #2a2a2a;">
              <p style="margin:0 0 6px;font-size:22px;font-weight:900;color:#fff;">🚨 New Report</p>
              <p style="margin:0 0 24px;font-size:14px;color:#888;">${isPostReport ? "A post has been reported" : "A user has been reported"}</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #2a2a2a;border-radius:14px;margin-bottom:20px;">
                <tr><td style="padding:20px 24px;">
                  <p style="margin:0 0 12px;font-size:13px;color:#888;"><strong style="color:#e378ac;">Reported by:</strong> @${reporterUsername}</p>
                  <p style="margin:0 0 12px;font-size:13px;color:#888;"><strong style="color:#fff;">Reported user:</strong> @${reportedUsername}</p>
                  <p style="margin:0 0 ${postContent ? "12px" : "0"};font-size:13px;color:#888;"><strong style="color:#fff;">Reason:</strong> ${reason}</p>
                  ${postContent ? `<p style="margin:0;font-size:13px;color:#888;"><strong style="color:#fff;">Post content:</strong> ${postContent.slice(0, 200)}${postContent.length > 200 ? "…" : ""}</p>` : ""}
                </td></tr>
              </table>

              <a href="https://haven-admin.vercel.app/reports" style="display:inline-block;background:#e378ac;color:#fff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:12px;text-decoration:none;">
                Review in Admin →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  await resend().emails.send({
    from: "Haven Admin <noreply@gethavenapp.xyz>",
    to: "havenapp2026@gmail.com",
    subject: `🚨 New ${isPostReport ? "post" : "user"} report — ${reason}`,
    html,
  })
}
