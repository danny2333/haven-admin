import { NextRequest, NextResponse } from "next/server"

const attempts = new Map<string, { count: number; resetAt: number }>()

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  const now = Date.now()
  const entry = attempts.get(ip)

  if (entry && now < entry.resetAt && entry.count >= 10) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
  }

  if (!entry || now >= entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
  } else {
    entry.count++
  }

  const { password } = await req.json()

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 })
  }

  attempts.delete(ip)

  const res = NextResponse.json({ ok: true })
  res.cookies.set("haven_admin", process.env.ADMIN_SESSION_TOKEN ?? "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  })
  return res
}
