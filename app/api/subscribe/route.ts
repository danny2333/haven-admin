import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { isAdminAuthed } from "@/lib/auth"

export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const subscription = await req.json()
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })
  }

  // Upsert by endpoint so refreshing doesn't create duplicates
  await supabase
    .from("admin_push_subscriptions")
    .upsert({ subscription, endpoint: subscription.endpoint }, { onConflict: "endpoint" })

  return NextResponse.json({ ok: true })
}
