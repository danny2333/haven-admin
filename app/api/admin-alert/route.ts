import { NextRequest, NextResponse } from "next/server"
import { sendAdminPush } from "@/lib/webpush"
import { supabase } from "@/lib/supabase"

// Keep this in sync with Haven/constants/crisisKeywords.js — same list is
// duplicated in posts/page.tsx and dailies/page.tsx since the two repos
// can't share an import.
const CRISIS_KEYWORDS = [
  "suicide", "suicidal",
  "kill myself", "killing myself", "killed myself", "kms",
  "end my life", "ending my life", "end it all",
  "want to die", "wanna die", "wanted to die",
  "don't want to be here", "dont want to be here",
  "don't want to live", "dont want to live",
  "no reason to live", "nothing to live for",
  "not worth living", "not worth it anymore",
  "better off dead", "better off without me",
  "can't go on", "cant go on", "can't do this anymore", "cant do this anymore",
  "self harm", "self-harm", "selfharm",
  "cut myself", "cutting myself", "cutting again", "i cut",
  "hurt myself", "hurting myself", "hurt my self",
  "overdose", "od'd", "od on", "take my own life",
  "give up on life", "giving up on life",
  "goodbye forever", "final goodbye",
  "no one would miss me", "nobody would miss me",
  "i'm done with life", "im done with life",
  "i hate myself so much",
  "i want to disappear forever",
]

function hasCrisis(text: string) {
  const lower = text.toLowerCase()
  return CRISIS_KEYWORDS.some(kw => lower.includes(kw))
}

function clip(text: string, max = 120) {
  if (!text) return ""
  return text.length > max ? text.slice(0, max) + "…" : text
}

export async function POST(req: NextRequest) {
  if (req.headers.get("x-webhook-secret") !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 })
  }

  const { table, record } = body ?? {}
  if (!record) return NextResponse.json({ ok: true })

  // ── New post ───────────────────────────────────────────────────────────────
  if (table === "posts") {
    const text = [record.content, record.headline].filter(Boolean).join(" ")
    if (hasCrisis(text)) {
      await sendAdminPush(
        "🚨 Crisis Alert — Haven",
        clip(record.content || record.headline || "Anonymous post needs attention"),
        { type: "crisis", postId: record.id }
      )
    }
  }

  // ── New report ─────────────────────────────────────────────────────────────
  if (table === "reports") {
    const ids = [record.reporter_id, record.reported_user_id].filter(Boolean)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", ids)
    const map: Record<string, string> = {}
    profiles?.forEach((p: any) => { map[p.id] = p.username })

    await sendAdminPush(
      "📋 New Report — Haven",
      `@${map[record.reporter_id] ?? "unknown"} reported @${map[record.reported_user_id] ?? "unknown"} · ${clip(record.reason ?? "no reason given", 80)}`,
      { type: "report", reportId: record.id }
    )
  }

  // ── New waitlist signup ────────────────────────────────────────────────────
  if (table === "waitlist") {
    await sendAdminPush(
      "🌸 New Waitlist Signup — Haven",
      `${record.name ?? "Someone"} (${record.email ?? "no email"}) joined the waitlist`,
      { type: "waitlist", id: record.id }
    )
  }

  // ── New invite code request ────────────────────────────────────────────────
  if (table === "code_requests") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, email")
      .eq("id", record.user_id)
      .single()
    const who = profile?.username ? `@${profile.username}` : (profile?.email ?? "unknown user")

    await sendAdminPush(
      "🔑 Code Request — Haven",
      `${who} is requesting invite codes · ${clip(record.reason ?? "no reason given", 80)}`,
      { type: "code_request", id: record.id }
    )
  }

  return NextResponse.json({ ok: true })
}
