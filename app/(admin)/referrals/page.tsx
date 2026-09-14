import { supabase } from "@/lib/supabase"
import Image from "next/image"

export const revalidate = 0

export default async function ReferralsPage() {
  const { data: rows } = await supabase
    .from("referral_leaderboard")
    .select("inviter_id, total_invited, active_invited")
    .order("total_invited", { ascending: false })
    .limit(50)

  const inviterIds = (rows ?? []).map(r => r.inviter_id)
  const { data: profiles } = inviterIds.length
    ? await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", inviterIds)
    : { data: [] as any[] }

  const profileMap: Record<string, { username: string; display_name: string | null; avatar_url: string | null }> = {}
  for (const p of profiles ?? []) profileMap[p.id] = p

  const totalReferred = (rows ?? []).reduce((sum, r) => sum + r.total_invited, 0)
  const totalActive = (rows ?? []).reduce((sum, r) => sum + r.active_invited, 0)

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Referral Leaderboard</h2>
      <p className="text-gray-500 text-sm mb-6">
        Who's actually bringing people in — and whether those invites turn into real activity.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <p className="text-3xl font-black text-white mb-1">{rows?.length ?? 0}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">People With ≥1 Invite</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <p className="text-3xl font-black text-white mb-1">{totalReferred}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Total Referred Signups</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <p className="text-3xl font-black text-white mb-1">
            {totalReferred ? Math.round((totalActive / totalReferred) * 100) : 0}%
          </p>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Referred → Actually Active</p>
        </div>
      </div>

      {(!rows || rows.length === 0) ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-12 text-center text-gray-600 text-sm">
          No one has a referral yet.
        </div>
      ) : (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-6 py-4">Rank</th>
                <th className="text-left px-6 py-4">User</th>
                <th className="text-left px-6 py-4">Invited</th>
                <th className="text-left px-6 py-4">Active</th>
                <th className="text-left px-6 py-4">Activation Rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const p = profileMap[r.inviter_id]
                const displayName = p?.display_name || (p?.username ? `@${p.username}` : "unknown")
                const rate = r.total_invited ? Math.round((r.active_invited / r.total_invited) * 100) : 0
                return (
                  <tr key={r.inviter_id} className={`border-b border-[#1f1f1f] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-black ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-gray-600"}`}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {p?.avatar_url ? (
                          <Image src={p.avatar_url} alt={displayName} width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#e378ac]/20 border border-[#e378ac] flex items-center justify-center text-[#e378ac] font-black text-xs">
                            {displayName[0]?.toUpperCase() ?? "?"}
                          </div>
                        )}
                        <div>
                          <p className="text-white font-semibold">{displayName}</p>
                          {p?.username && <p className="text-gray-500 text-xs">@{p.username}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-semibold">{r.total_invited}</td>
                    <td className="px-6 py-4 text-gray-400">{r.active_invited}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                        rate >= 75 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : rate >= 40 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        : "bg-white/5 text-gray-500 border-white/10"
                      }`}>
                        {rate}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
