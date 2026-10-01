import { supabase } from "@/lib/supabase"
import { isAdminAuthed } from "@/lib/auth"
import { broadcastPush } from "@/lib/pushBroadcast"
import { NextRequest, NextResponse } from "next/server"

const HAVEN_ID = "b8ba29ea-8cb9-45e3-bd0e-f9e05fb2f1c6"

export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { message } = await req.json()
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 })
  }

  // Fetch all users except havenofficial
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id")
    .neq("id", HAVEN_ID)

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 })
  }
  if (!profiles?.length) {
    return NextResponse.json({ sent: 0, errors: 0, total: 0 })
  }

  const content = message.trim()
  const preview = content.length > 60 ? content.slice(0, 60) + "…" : content
  const now = new Date().toISOString()
  let sent = 0
  let errors = 0
  const sentUserIds: string[] = []

  // Process in batches of 50 to avoid DB overload
  const BATCH = 50
  for (let i = 0; i < profiles.length; i += BATCH) {
    await Promise.all(
      profiles.slice(i, i + BATCH).map(async ({ id: userId }) => {
        try {
          // Find or create the conversation
          const { data: existing } = await supabase
            .from("conversations")
            .select("id")
            .or(
              `and(user1_id.eq.${HAVEN_ID},user2_id.eq.${userId}),` +
              `and(user1_id.eq.${userId},user2_id.eq.${HAVEN_ID})`
            )
            .maybeSingle()

          let convoId: string
          if (existing) {
            convoId = existing.id
          } else {
            const { data: created, error: createErr } = await supabase
              .from("conversations")
              .insert({ user1_id: HAVEN_ID, user2_id: userId })
              .select("id")
              .single()
            if (createErr || !created) { errors++; return }
            convoId = created.id
          }

          // Insert the message
          const { error: msgErr } = await supabase
            .from("messages")
            .insert({ conversation_id: convoId, sender_id: HAVEN_ID, content, is_read: false })

          if (msgErr) { errors++; return }

          // Update conversation preview
          await supabase
            .from("conversations")
            .update({ last_message_at: now, last_message_text: preview })
            .eq("id", convoId)

          sent++
          sentUserIds.push(userId)
        } catch {
          errors++
        }
      })
    )
  }

  const { sent: pushed } = await broadcastPush(
    "Haven 💌",
    preview,
    { type: "dm", conversationId: null },
    sentUserIds
  )

  return NextResponse.json({ sent, errors, total: profiles.length, pushed })
}
