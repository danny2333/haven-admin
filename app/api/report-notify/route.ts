import { NextRequest, NextResponse } from "next/server"
import { sendReportNotificationEmail } from "@/lib/email"
import { supabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  // Verify the request is from Supabase webhook
  const secret = req.headers.get("x-webhook-secret")
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const report = body.record

    if (!report) return NextResponse.json({ ok: true })

    // Fetch reporter and reported usernames
    const userIds = [report.reporter_id, report.reported_user_id].filter(Boolean)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds)

    const profileMap: Record<string, string> = {}
    profiles?.forEach(p => { profileMap[p.id] = p.username })

    // Fetch post content if it's a post report
    let postContent = null
    if (report.reported_post_id) {
      const { data: post } = await supabase
        .from("posts")
        .select("content")
        .eq("id", report.reported_post_id)
        .single()
      postContent = post?.content ?? null
    }

    await sendReportNotificationEmail({
      reason: report.reason ?? "No reason given",
      reporterUsername: profileMap[report.reporter_id] ?? "unknown",
      reportedUsername: profileMap[report.reported_user_id] ?? "unknown",
      isPostReport: !!report.reported_post_id,
      postContent,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("Report notify error:", e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
