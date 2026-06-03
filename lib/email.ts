import nodemailer from "nodemailer"

function getTransporter() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  console.log("Email config — user:", user, "pass length:", pass?.length ?? 0)
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  })
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

  await getTransporter().sendMail({
    from: `"Haven" <${process.env.GMAIL_USER}>`,
    to,
    subject: "We've received your application — Haven",
    html,
  })
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

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <p style="margin:0;font-size:36px;font-style:italic;font-weight:900;color:#e378ac;letter-spacing:-1px;font-family:Georgia,serif;">
                haven
              </p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#1a1a1a;border-radius:24px;padding:40px;border:1px solid #2a2a2a;">

              <!-- Greeting -->
              <p style="margin:0 0 8px;font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.5px;">
                You're in 🌸
              </p>
              <p style="margin:0 0 28px;font-size:16px;color:#888;line-height:1.6;">
                Hi ${name}, welcome to Haven.
              </p>

              <!-- Body -->
              <p style="margin:0 0 24px;font-size:15px;color:#bbb;line-height:1.7;">
                Haven is a safe, women-only space to be real — share your thoughts, your wins, your hard days, without the pressure of performing for anyone. We're so glad you're here.
              </p>

              <!-- Code block -->
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

              <!-- Instructions -->
              <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#fff;">
                How to join:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding:4px 0;">
                    <p style="margin:0;font-size:14px;color:#bbb;line-height:1.6;">
                      1. Download the <strong style="color:#fff;">Haven</strong> app
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;">
                    <p style="margin:0;font-size:14px;color:#bbb;line-height:1.6;">
                      2. Tap <strong style="color:#fff;">"Have an invite code?"</strong> on the sign up screen
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;">
                    <p style="margin:0;font-size:14px;color:#bbb;line-height:1.6;">
                      3. Enter your code — <strong style="color:#fff;">${formattedCode}</strong>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 0;">
                    <p style="margin:0;font-size:14px;color:#bbb;line-height:1.6;">
                      4. Create your account and you're in ✨
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Invite codes note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td style="background:#0f0f0f;border:1px solid #2a2a2a;border-radius:12px;padding:20px 18px;">
                    <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#fff;">
                      🎟️ You'll receive 7 invite codes when you join
                    </p>
                    <p style="margin:0;font-size:13px;color:#aaa;line-height:1.7;">
                      Once you're in, you'll get 7 codes to share with people you trust. Haven is women-only — please be very careful who you give them to. The people you invite reflect on you, and their behaviour in the app is tied to your account.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Warning block -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#ff444415;border:1px solid #ff444430;border-radius:12px;padding:16px 18px;">
                    <p style="margin:0;font-size:13px;color:#ff7070;line-height:1.7;">
                      ⚠️ <strong>Important:</strong> If you invite a man or someone who violates Haven's safety rules, <strong>both accounts may be permanently banned</strong>. Your codes are your responsibility — treat them seriously.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Single-use note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#e378ac12;border:1px solid #e378ac30;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0;font-size:13px;color:#e378ac;line-height:1.6;">
                      🔒 Your personal invite code above is for you only — it can only be used once. Please don't share it publicly.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Sign off -->
              <p style="margin:0;font-size:15px;color:#888;line-height:1.7;">
                We can't wait to see you in there. Haven is growing slowly and intentionally — every person here was chosen. That includes you.
              </p>

              <p style="margin:24px 0 0;font-size:15px;color:#888;">
                With love,<br />
                <strong style="color:#e378ac;">The Haven Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
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

  await getTransporter().sendMail({
    from: `"Haven" <${process.env.GMAIL_USER}>`,
    to,
    subject: "You're in 🌸 Welcome to Haven",
    html,
  })
}
