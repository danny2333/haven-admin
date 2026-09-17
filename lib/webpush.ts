import webpush from "web-push"
import { supabase } from "./supabase"

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function sendAdminPush(title: string, body: string, data: Record<string, unknown> = {}) {
  const { data: rows } = await supabase
    .from("admin_push_subscriptions")
    .select("subscription")

  if (!rows?.length) {
    console.warn("webpush: no subscriptions stored")
    return
  }

  const payload = JSON.stringify({ title, body, data })

  await Promise.allSettled(
    rows.map(row =>
      webpush.sendNotification(row.subscription, payload).catch(async err => {
        // 410 = subscription expired/unsubscribed — clean it up
        if (err.statusCode === 410) {
          await supabase
            .from("admin_push_subscriptions")
            .delete()
            .eq("subscription", row.subscription)
        }
      })
    )
  )
}
