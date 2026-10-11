import { supabase } from "@/lib/supabase"
import { fmtDate, fmtDateTime, getAdminTZ } from "@/lib/date"
import Link from "next/link"
import { getAmbassadorReferrals, type ReferralRow } from "../actions"
import AmbassadorStatusActions from "@/components/AmbassadorStatusActions"
import AmbassadorMarkPaidForm from "@/components/AmbassadorMarkPaidForm"
import EditAmbassadorForm from "@/components/EditAmbassadorForm"

export const revalidate = 0

const STATUS_STYLES: Record<string, string> = {
  unused:       "bg-gray-400/10 text-gray-400",
  in_progress:  "bg-blue-400/10 text-blue-400",
  qualified:    "bg-green-400/10 text-green-400",
  expired:      "bg-gray-500/10 text-gray-500",
  disqualified: "bg-red-400/10 text-red-400",
}

function statusLabel(r: ReferralRow): string {
  switch (r.status) {
    case "unused": return "Unused"
    case "qualified": return "Qualified"
    case "expired": return "Expired"
    case "disqualified":
      return r.is_self_referral ? "Disqualified (self-referral)" : r.is_banned ? "Disqualified (banned)" : "Disqualified (suspended)"
    default: {
      if (!r.window_ends_at) return "In progress"
      const daysLeft = Math.max(0, Math.ceil((new Date(r.window_ends_at).getTime() - Date.now()) / 86400000))
      return `${r.active_days_count} of 3 days · ${r.first_contribution_at ? "contributed" : "no post/comment yet"} · ${daysLeft}d left`
    }
  }
}

function monthOffset(ym: string, delta: number): string {
  const d = new Date(ym + "-01T00:00:00")
  d.setMonth(d.getMonth() + delta)
  return d.toISOString().slice(0, 7)
}

export default async function AmbassadorDetail({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { month?: string }
}) {
  const tz = await getAdminTZ()

  const { data: ambassador } = await supabase
    .from("ambassadors")
    .select("id, user_id, campus, payout_method, payout_handle, status, removal_reason, rate_cents, monthly_cap_cents, started_at, profiles(username, display_name, avatar_url, email)")
    .eq("id", params.id)
    .single()

  if (!ambassador) {
    return <p className="text-gray-500">Ambassador not found.</p>
  }

  const profile = ambassador.profiles as any
  const { data: referrals, error: referralsError } = await getAmbassadorReferrals(ambassador.id)

  const selectedMonth = searchParams.month ?? new Date().toISOString().slice(0, 7)
  const payoutMonthKey = `${selectedMonth}-01`
  const monthLabel = new Date(payoutMonthKey + "T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })

  const { data: existingPayout } = await supabase
    .from("ambassador_payouts")
    .select("*")
    .eq("ambassador_id", ambassador.id)
    .eq("payout_month", payoutMonthKey)
    .maybeSingle()

  const { data: payoutHistory } = await supabase
    .from("ambassador_payouts")
    .select("payout_month, qualified_count, paid_count, amount_cents, cap_applied, paid_at")
    .eq("ambassador_id", ambassador.id)
    .order("payout_month", { ascending: false })

  const qualifiedThisMonth = referrals.filter(r => r.payout_month === payoutMonthKey)
  const capCount = Math.floor(ambassador.monthly_cap_cents / ambassador.rate_cents)
  const liveQualifiedCount = qualifiedThisMonth.length
  const livePaidCount = Math.min(liveQualifiedCount, capCount)
  const liveAmountCents = livePaidCount * ambassador.rate_cents
  const liveCapApplied = liveQualifiedCount > capCount

  const lifetimeQualified = referrals.filter(r => r.payout_month).length
  const lifetimePaidCents = (payoutHistory ?? []).reduce((sum, p) => sum + p.amount_cents, 0)

  return (
    <div>
      <Link href="/ambassadors" className="text-gray-500 text-xs hover:text-white transition">← All ambassadors</Link>

      <div className="flex items-start justify-between mt-3 mb-8">
        <div className="flex items-center gap-4">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#2a2a2a]" />
          )}
          <div>
            <h2 className="text-2xl font-black text-white">@{profile?.username ?? "unknown"}</h2>
            <p className="text-gray-500 text-sm">
              {ambassador.campus || "No campus set"} · Ambassador since {fmtDate(ambassador.started_at, tz)}
            </p>
          </div>
        </div>
        <AmbassadorStatusActions id={ambassador.id} userId={ambassador.user_id} status={ambassador.status as any} />
      </div>

      {/* Lifetime stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <p className="text-3xl font-black text-white mb-1">{referrals.length}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Codes Created</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <p className="text-3xl font-black text-white mb-1">{lifetimeQualified}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Lifetime Qualified</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <p className="text-3xl font-black text-[#e378ac] mb-1">${(lifetimePaidCents / 100).toFixed(2)}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Lifetime Paid</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: referral activity */}
        <div className="col-span-2">
          <p className="text-white font-bold mb-3">Invite code activity</p>
          {referralsError && <p className="text-red-400 text-sm mb-3">Couldn't load referrals: {referralsError}</p>}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Code</th>
                  <th className="text-left px-5 py-3">Referred user</th>
                  <th className="text-left px-5 py-3">Signed up</th>
                  <th className="text-left px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r, i) => (
                  <tr key={r.invite_code_id} className={`border-b border-[#1f1f1f] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                    <td className="px-5 py-3 font-mono text-gray-300">{r.code}</td>
                    <td className="px-5 py-3">
                      {r.used_by ? (
                        <Link href={`/users/${r.used_by}`} className="text-[#e378ac] font-semibold hover:underline">
                          @{r.used_by_username ?? "unknown"}
                        </Link>
                      ) : (
                        <span className="text-gray-600 italic">unused</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{r.redeemed_at ? fmtDate(r.redeemed_at, tz) : "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${STATUS_STYLES[r.status]}`}>
                        {statusLabel(r)}
                      </span>
                    </td>
                  </tr>
                ))}
                {referrals.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-600 italic">No invite codes yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: payout info + monthly statement */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
            <p className="text-white font-bold mb-3">Payout info</p>
            <EditAmbassadorForm
              id={ambassador.id}
              campus={ambassador.campus}
              payoutMethod={ambassador.payout_method}
              payoutHandle={ambassador.payout_handle}
              rateCents={ambassador.rate_cents}
              monthlyCapCents={ambassador.monthly_cap_cents}
            />
          </div>

          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white font-bold">Monthly statement</p>
              <div className="flex items-center gap-2 text-xs">
                <Link href={`?month=${monthOffset(selectedMonth, -1)}`} className="text-gray-500 hover:text-white transition">←</Link>
                <span className="text-gray-300 font-semibold">{monthLabel}</span>
                <Link href={`?month=${monthOffset(selectedMonth, 1)}`} className="text-gray-500 hover:text-white transition">→</Link>
              </div>
            </div>

            {existingPayout ? (
              <div className="bg-[#111] border border-green-400/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-green-400 font-bold text-sm">✓ Paid</p>
                  <p className="text-[#e378ac] font-black text-xl">${(existingPayout.amount_cents / 100).toFixed(2)}</p>
                </div>
                <p className="text-gray-500 text-xs">
                  {existingPayout.qualified_count} qualified{existingPayout.cap_applied ? ` (${existingPayout.paid_count} paid, cap reached)` : ""}
                </p>
                <p className="text-gray-600 text-xs mt-1">
                  Paid {fmtDateTime(existingPayout.paid_at, tz)}
                  {existingPayout.payout_reference ? ` · Ref: ${existingPayout.payout_reference}` : ""}
                </p>
              </div>
            ) : (
              <AmbassadorMarkPaidForm
                ambassadorId={ambassador.id}
                payoutMonth={payoutMonthKey}
                monthLabel={monthLabel}
                qualifiedCount={liveQualifiedCount}
                paidCount={livePaidCount}
                amountCents={liveAmountCents}
                capApplied={liveCapApplied}
                hasEmail={!!profile?.email}
              />
            )}
          </div>

          {payoutHistory && payoutHistory.length > 0 && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <p className="text-white font-bold mb-3 text-sm">Payout history</p>
              <div className="flex flex-col gap-2">
                {payoutHistory.map(p => (
                  <div key={p.payout_month} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">
                      {new Date(p.payout_month + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </span>
                    <span className="text-gray-500">{p.qualified_count} qualified</span>
                    <span className="text-white font-bold">${(p.amount_cents / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
