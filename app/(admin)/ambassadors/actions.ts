"use server"

import { supabase } from "@/lib/supabase"
import { fmtDate, getAdminTZ } from "@/lib/date"
import { broadcastPush } from "@/lib/pushBroadcast"
import { revalidatePath } from "next/cache"
import nodemailer from "nodemailer"

function makeTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

export type ReferralRow = {
  invite_code_id: string
  code: string
  created_at: string
  used_by: string | null
  used_by_username: string | null
  redeemed_at: string | null
  window_ends_at: string | null
  active_days_count: number
  first_contribution_at: string | null
  is_banned: boolean
  is_suspended: boolean
  is_self_referral: boolean
  status: "unused" | "pending" | "in_progress" | "qualified" | "expired" | "disqualified"
  qualified_at: string | null
  payout_month: string | null
}

export async function getAmbassadorReferrals(ambassadorId: string): Promise<{ data: ReferralRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc("ambassador_referral_status", { p_ambassador_id: ambassadorId })
  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as ReferralRow[], error: null }
}

export type ProfileSuggestion = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

// Typeahead for the "make ambassador" form — excludes people who are
// already ambassadors so the list only ever shows people you can actually assign.
export async function searchProfiles(query: string): Promise<ProfileSuggestion[]> {
  const q = query.trim().replace(/^@/, "")
  if (q.length < 2) return []

  const [{ data: profiles }, { data: existing }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .ilike("username", `${q}%`)
      .order("username")
      .limit(8),
    supabase.from("ambassadors").select("user_id"),
  ])

  const alreadyAmbassador = new Set((existing ?? []).map(a => a.user_id))
  return (profiles ?? []).filter(p => !alreadyAmbassador.has(p.id))
}

export async function createAmbassador(formData: FormData): Promise<{ error: string | null }> {
  const username = (formData.get("username") as string)?.trim().replace(/^@/, "")
  const campus = (formData.get("campus") as string)?.trim() || null
  const payoutMethod = (formData.get("payout_method") as string) || null
  const payoutHandle = (formData.get("payout_handle") as string)?.trim() || null
  if (!username) return { error: "Username is required" }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, is_ambassador")
    .eq("username", username)
    .maybeSingle()
  if (profileError) return { error: profileError.message }
  if (!profile) return { error: `No user found with username @${username}` }

  const { data: existing } = await supabase
    .from("ambassadors")
    .select("id, status")
    .eq("user_id", profile.id)
    .maybeSingle()
  if (existing) return { error: `@${username} is already an ambassador (status: ${existing.status})` }

  const { error: insertError } = await supabase.from("ambassadors").insert([{
    user_id: profile.id,
    campus,
    payout_method: payoutMethod,
    payout_handle: payoutHandle,
  }])
  if (insertError) return { error: insertError.message }

  await supabase.from("profiles").update({ is_ambassador: true }).eq("id", profile.id)

  await supabase.from("notifications").insert([{
    user_id: profile.id,
    type: "ambassador_welcome",
    from_user_id: null,
  }])
  await broadcastPush(
    "Welcome to the Haven Ambassador Program 🎓",
    "Tap to see what you'll be doing and what you'll earn.",
    { type: "ambassador_welcome" },
    [profile.id],
  )

  revalidatePath("/ambassadors")
  return { error: null }
}

export async function updateAmbassador(id: string, formData: FormData): Promise<{ error: string | null }> {
  const campus = (formData.get("campus") as string)?.trim() || null
  const payoutMethod = (formData.get("payout_method") as string) || null
  const payoutHandle = (formData.get("payout_handle") as string)?.trim() || null
  const rateDollars = parseFloat(formData.get("rate_dollars") as string)
  const capDollars = parseFloat(formData.get("cap_dollars") as string)

  const update: Record<string, unknown> = { campus, payout_method: payoutMethod, payout_handle: payoutHandle }
  if (!isNaN(rateDollars) && rateDollars > 0) update.rate_cents = Math.round(rateDollars * 100)
  if (!isNaN(capDollars) && capDollars > 0) update.monthly_cap_cents = Math.round(capDollars * 100)

  const { error } = await supabase.from("ambassadors").update(update).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(`/ambassadors/${id}`)
  revalidatePath("/ambassadors")
  return { error: null }
}

export async function setAmbassadorStatus(
  id: string,
  userId: string,
  status: "active" | "paused" | "removed",
  removalReason: string | null,
): Promise<{ error: string | null }> {
  const update: Record<string, unknown> = { status }
  if (status === "removed") {
    update.removal_reason = removalReason || "left"
    update.ended_at = new Date().toISOString()
  } else {
    update.removal_reason = null
    update.ended_at = null
  }
  const { error } = await supabase.from("ambassadors").update(update).eq("id", id)
  if (error) return { error: error.message }

  await supabase.from("profiles").update({ is_ambassador: status !== "removed" }).eq("id", userId)

  revalidatePath(`/ambassadors/${id}`)
  revalidatePath("/ambassadors")
  return { error: null }
}

function statusLabel(r: ReferralRow): string {
  switch (r.status) {
    case "unused": return "Unused"
    case "qualified": return "Qualified"
    case "expired": return "Expired"
    case "disqualified": return "Disqualified"
    default: {
      if (!r.window_ends_at) return "In progress"
      const daysLeft = Math.max(0, Math.ceil((new Date(r.window_ends_at).getTime() - Date.now()) / 86400000))
      return `${r.active_days_count} of 3 days (${daysLeft}d left)`
    }
  }
}

// Builds the code-level statement table and sends it, stripping anything
// about the referred user — ambassadors only ever see code-level status,
// per the program's privacy rule. Marks the payout paid in the same call.
export async function markAmbassadorPaid(
  ambassadorId: string,
  payoutMonth: string, // "YYYY-MM-01"
  payoutReference: string,
): Promise<{ error: string | null }> {
  const tz = await getAdminTZ()

  const { data: ambassador, error: ambError } = await supabase
    .from("ambassadors")
    .select("id, campus, payout_method, payout_handle, rate_cents, monthly_cap_cents, profiles(username, email, display_name)")
    .eq("id", ambassadorId)
    .single()
  if (ambError || !ambassador) return { error: ambError?.message ?? "Ambassador not found" }

  const { data: referrals, error: refError } = await getAmbassadorReferrals(ambassadorId)
  if (refError) return { error: refError }

  const monthRows = referrals.filter(r => r.payout_month === payoutMonth)
  const qualifiedCount = monthRows.length
  const rateCents = ambassador.rate_cents
  const capCount = Math.floor(ambassador.monthly_cap_cents / rateCents)
  const paidCount = Math.min(qualifiedCount, capCount)
  const amountCents = paidCount * rateCents
  const capApplied = qualifiedCount > capCount

  const { error: upsertError } = await supabase.from("ambassador_payouts").upsert([{
    ambassador_id: ambassadorId,
    payout_month: payoutMonth,
    qualified_count: qualifiedCount,
    paid_count: paidCount,
    amount_cents: amountCents,
    cap_applied: capApplied,
    payout_method: ambassador.payout_method,
    payout_reference: payoutReference || null,
    statement_sent_at: new Date().toISOString(),
    paid_at: new Date().toISOString(),
  }], { onConflict: "ambassador_id,payout_month" })
  if (upsertError) return { error: upsertError.message }

  const profile = ambassador.profiles as any
  const email = profile?.email
  const monthLabel = new Date(payoutMonth + "T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })

  if (email) {
    // Scope the statement to codes actually relevant to this period: newly
    // credited this month (regardless of when they signed up — qualifying
    // can lag signup by up to 30 days), signed up this month, or issued and
    // still unused this month. Shown code-level only — never the referred
    // user's identity, per the program's privacy rule.
    const monthStart = new Date(payoutMonth + "T00:00:00")
    const monthEnd = new Date(monthStart)
    monthEnd.setMonth(monthEnd.getMonth() + 1)
    const inPeriod = (r: ReferralRow) => {
      if (r.payout_month === payoutMonth) return true
      const anchor = r.redeemed_at ?? r.created_at
      const d = new Date(anchor)
      return d >= monthStart && d < monthEnd
    }
    const periodRows = referrals.filter(inPeriod)
    const rowsHtml = periodRows.length
      ? periodRows.map(r => `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;color:#eee;font-family:monospace;">${r.code}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;color:#aaa;">${r.used_by ? "Yes" : "No"}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;color:#aaa;">${statusLabel(r)}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;color:${r.payout_month === payoutMonth ? "#4ade80" : "#666"};font-weight:${r.payout_month === payoutMonth ? "700" : "400"};">${r.payout_month === payoutMonth ? `$${(rateCents / 100).toFixed(2)}` : "$0.00"}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="4" style="padding:16px;color:#666;text-align:center;">No invite codes yet this period.</td></tr>`

    await makeTransporter().sendMail({
      from: `"Haven Ambassador Program" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Your Haven Ambassador statement — ${monthLabel}`,
      html: `
        <div style="background:#0f0f0f;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <div style="max-width:620px;margin:0 auto;">
            <p style="font-size:32px;font-style:italic;font-weight:900;color:#e378ac;font-family:Georgia,serif;margin:0 0 32px;">haven</p>
            <div style="background:#1a1a1a;border-radius:20px;padding:32px;border:1px solid #2a2a2a;">
              <p style="font-size:16px;font-weight:700;color:#fff;margin:0 0 4px;">Hi ${profile?.display_name || `@${profile?.username}` || "there"},</p>
              <p style="font-size:14px;color:#999;margin:0 0 24px;">Here's your Ambassador Program statement for <strong style="color:#ccc;">${monthLabel}</strong>.</p>

              <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                <thead>
                  <tr>
                    <th style="padding:10px 12px;text-align:left;color:#777;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #2a2a2a;">Code</th>
                    <th style="padding:10px 12px;text-align:left;color:#777;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #2a2a2a;">Used</th>
                    <th style="padding:10px 12px;text-align:left;color:#777;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #2a2a2a;">Status</th>
                    <th style="padding:10px 12px;text-align:left;color:#777;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #2a2a2a;">Amount</th>
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
              </table>

              <div style="background:#111;border:1px solid #e378ac;border-radius:12px;padding:18px 20px;margin-bottom:20px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                  <span style="color:#999;font-size:13px;">Qualified this month</span>
                  <span style="color:#fff;font-weight:700;font-size:13px;">${qualifiedCount}${capApplied ? ` (${paidCount} paid, cap reached)` : ""}</span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                  <span style="color:#999;font-size:13px;">Total paid</span>
                  <span style="color:#4ade80;font-weight:900;font-size:18px;">$${(amountCents / 100).toFixed(2)}</span>
                </div>
              </div>

              <p style="font-size:13px;color:#888;line-height:1.7;margin:0 0 8px;">Paid via ${ambassador.payout_method === "cash_app" ? "Cash App" : "Zelle"}${payoutReference ? ` · Ref: ${payoutReference}` : ""} on ${fmtDate(new Date().toISOString(), tz)}.</p>
              <p style="font-size:13px;color:#888;line-height:1.7;margin:0;">Questions about this statement? Reply within 7 days.</p>

              <p style="margin:28px 0 0;font-size:14px;color:#666;">
                — The Haven Team<br/>
                <a href="mailto:havenapp2026@gmail.com" style="color:#e378ac;">havenapp2026@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      `,
    }).catch((e: any) => console.error("Ambassador statement email failed:", e))
  }

  revalidatePath(`/ambassadors/${ambassadorId}`)
  return { error: null }
}
