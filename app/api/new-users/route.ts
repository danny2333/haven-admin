import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { isAdminAuthed } from "@/lib/auth"

export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const since = req.nextUrl.searchParams.get("since")
  if (!since) return NextResponse.json({ users: [] })

  const { data } = await supabase
    .from("profiles")
    .select("id, username, created_at")
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10)

  return NextResponse.json({ users: data ?? [] })
}
