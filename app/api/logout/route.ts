import { NextResponse } from "next/server"

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete("haven_admin")
  return res
}
