import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { isAdminAuthed } from "@/lib/auth"

export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ ok: false })
  await supabase.from("invite_codes").delete().in("id", ids)
  return NextResponse.json({ ok: true })
}
