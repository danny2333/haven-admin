import { supabase } from "./supabase"

// Deliberately separate from the app's send-push edge function, which is
// built for regular person-to-person actions (a like, a DM, a follow) and
// has anti-abuse limits that don't make sense for an admin broadcast: a hard
// 100-recipient cap and a 60/minute rate limit keyed to a single sender
// identity. This runs server-side with the service role key directly against
// Expo's push API instead, batched in chunks of 100 (Expo's own per-request
// limit), with no artificial ceiling on total recipients.
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
const CHUNK_SIZE = 100

export async function broadcastPush(
  title: string,
  body: string,
  data: Record<string, unknown> = {},
  userIds?: string[]
): Promise<{ sent: number; total: number }> {
  let query = supabase.from("push_tokens").select("token")
  if (userIds) query = query.in("user_id", userIds)
  const { data: tokenRows, error } = await query

  if (error || !tokenRows?.length) return { sent: 0, total: 0 }

  const messages = tokenRows.map((row) => ({
    to: row.token,
    sound: "default",
    title: title.slice(0, 120),
    body: body.slice(0, 500),
    data,
  }))

  // push_tokens has one row per device, so a person on two phones gets it on both.
  // "sent" counts Expo's per-message "ok" tickets, not just a 200 for the batch;
  // tokens Expo reports as DeviceNotRegistered (app deleted / notifications
  // revoked) are removed so they stop inflating the totals.
  let sent = 0
  const dead: string[] = []
  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    const chunk = messages.slice(i, i + CHUNK_SIZE)
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(chunk),
      })
      if (!res.ok) continue
      const json = await res.json().catch(() => null)
      const tickets: any[] = Array.isArray(json?.data) ? json.data : []
      tickets.forEach((t, j) => {
        if (t?.status === "ok") sent += 1
        else if (t?.details?.error === "DeviceNotRegistered") dead.push(chunk[j].to)
      })
    } catch {
      // Keep going with remaining chunks even if one batch fails
    }
  }
  if (dead.length) {
    await supabase.from("push_tokens").delete().in("token", dead)
  }

  return { sent, total: messages.length }
}
