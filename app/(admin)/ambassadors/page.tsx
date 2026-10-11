import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { getAmbassadorReferrals } from "./actions"
import CreateAmbassadorForm from "@/components/CreateAmbassadorForm"

export const revalidate = 0

const STATUS_STYLES: Record<string, string> = {
  active:  "bg-green-400/10 text-green-400",
  paused:  "bg-yellow-400/10 text-yellow-400",
  removed: "bg-red-400/10 text-red-400",
}

export default async function AmbassadorsPage() {
  const { data: ambassadors } = await supabase
    .from("ambassadors")
    .select("id, campus, status, started_at, rate_cents, monthly_cap_cents, profiles(username, display_name, avatar_url)")
    .order("started_at", { ascending: false })

  const currentMonth = new Date().toISOString().slice(0, 7) + "-01"

  // Live-compute this month's qualified count per ambassador for the leaderboard.
  const rows = await Promise.all((ambassadors ?? []).map(async (a) => {
    const { data: referrals } = await getAmbassadorReferrals(a.id)
    const qualifiedThisMonth = referrals.filter(r => r.payout_month === currentMonth).length
    const lifetimeQualified = referrals.filter(r => r.status === "qualified" || r.payout_month).length
    const used = referrals.filter(r => r.used_by).length
    return { ambassador: a, qualifiedThisMonth, lifetimeQualified, codesUsed: used, codesTotal: referrals.length }
  }))

  rows.sort((a, b) => b.qualifiedThisMonth - a.qualifiedThisMonth)

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Ambassador Program</h2>
      <p className="text-gray-500 text-sm mb-8">
        {ambassadors?.length ?? 0} ambassador{(ambassadors?.length ?? 0) !== 1 ? "s" : ""} · $5 / qualified user · $350 monthly cap
      </p>

      {/* Add ambassador */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 mb-8 max-w-2xl">
        <p className="text-white font-bold mb-4">Make someone an ambassador</p>
        <CreateAmbassadorForm />
      </div>

      {/* Leaderboard */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide">
              <th className="text-left px-6 py-4">Ambassador</th>
              <th className="text-left px-6 py-4">Campus</th>
              <th className="text-left px-6 py-4">Status</th>
              <th className="text-left px-6 py-4">Codes used</th>
              <th className="text-left px-6 py-4">Qualified this month</th>
              <th className="text-left px-6 py-4">Lifetime qualified</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ ambassador: a, qualifiedThisMonth, lifetimeQualified, codesUsed, codesTotal }, i) => {
              const profile = a.profiles as any
              return (
                <tr key={a.id} className={`border-b border-[#1f1f1f] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                  <td className="px-6 py-4">
                    <Link href={`/ambassadors/${a.id}`} className="flex items-center gap-2.5 hover:opacity-80 transition">
                      {profile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#2a2a2a] shrink-0" />
                      )}
                      <div>
                        <p className="text-[#e378ac] font-bold">@{profile?.username ?? "unknown"}</p>
                        {profile?.display_name && <p className="text-gray-600 text-xs">{profile.display_name}</p>}
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{a.campus || "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${STATUS_STYLES[a.status]}`}>{a.status}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{codesUsed} / {codesTotal}</td>
                  <td className="px-6 py-4">
                    <span className="text-white font-bold">{qualifiedThisMonth}</span>
                    <span className="text-gray-600 text-xs"> / 70</span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{lifetimeQualified}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/ambassadors/${a.id}`} className="text-[#e378ac] text-xs font-bold hover:underline">
                      View →
                    </Link>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-600 italic">No ambassadors yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
