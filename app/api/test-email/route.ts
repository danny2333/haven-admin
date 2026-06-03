import nodemailer from "nodemailer"
import { NextResponse } from "next/server"

export async function GET() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) {
    return NextResponse.json({ error: "Env vars missing", user: !!user, pass: !!pass }, { status: 500 })
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  })

  // Step 1: verify connection
  try {
    await transporter.verify()
  } catch (e: any) {
    return NextResponse.json({
      step: "verify",
      error: e.message,
      code: e.code,
      response: e.response,
    }, { status: 500 })
  }

  // Step 2: send test email to yourself
  try {
    const info = await transporter.sendMail({
      from: `"Haven Test" <${user}>`,
      to: user,
      subject: "Haven admin email test",
      text: "If you receive this, email is working correctly.",
    })
    return NextResponse.json({ success: true, messageId: info.messageId })
  } catch (e: any) {
    return NextResponse.json({
      step: "send",
      error: e.message,
      code: e.code,
      response: e.response,
    }, { status: 500 })
  }
}
