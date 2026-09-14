import { supabase } from "@/lib/supabase"
import { fmtDate, fmtDateTime, getAdminTZ } from "@/lib/date"
import Image from "next/image"

export const revalidate = 0

// Usage only — never touches journal_entries.content/title/prompt/
// ai_reflection/video_url. journal_usage_by_user is a DB view that
// pre-aggregates counts and dates server-side; this page never selects the
// underlying rows at all.

export default async function JournalPage() {
  const tz = await getAdminTZ()
  const now = new Date().toISOString()
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: usage }, { count: entriesThisWeek }] = await Promise.all([
    supabase
      .from("journal_usage_by_user")
      .select("user_id, total_entries, checkin_entries, first_entry_at, last_entry_at")
      .order("last_entry_at", { ascending: false }),
    supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo),
  ])

  const rows = usage ?? []
  const userIds = rows.map(r => r.user_id)

  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds)
    : { data: [] as any[] }

  const profileMap: Record<string, { username: string; display_name: string | null; avatar_url: string | null }> = {}
  for (const p of profiles ?? []) profileMap[p.id] = p

  const totalJournalers = rows.length
  const totalEntries = rows.reduce((sum, r) => sum + (r.total_entries ?? 0), 0)
  const totalCheckins = rows.reduce((sum, r) => sum + (r.checkin_entries ?? 0), 0)
  const activeThisWeek = rows.filter(r => r.last_entry_at && r.last_entry_at >= weekAgo).length

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Journal</h2>
      <p className="text-gray-500 text-sm mb-6">
        Usage only — entry content, titles, and reflections are never shown here.
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "People who've journaled", value: totalJournalers },
          { label: "Total entries", value: totalEntries },
          { label: "Check-in entries", value: totalCheckins },
          { label: "Active this week", value: activeThisWeek },
        ].map(card => (
          <div key={card.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
            <p className="text-3xl font-black text-white mb-1">{card.value}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">{card.label}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 mb-3">
        {entriesThisWeek ?? 0} {entriesThisWeek === 1 ? "entry" : "entries"} written across all users in the last 7 days
      </p>

      {rows.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-12 text-center text-gray-600 text-sm">
          No one has used the journal yet.
        </div>
      ) : (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-6 py-4">User</th>
                <th className="text-left px-6 py-4">Total Entries</th>
                <th className="text-left px-6 py-4">Check-ins</th>
                <th className="text-left px-6 py-4">First Entry</th>
                <th className="text-left px-6 py-4">Last Entry</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const p = profileMap[r.user_id]
                const displayName = p?.display_name || (p?.username ? `@${p.username}` : "unknown")
                const isActive = r.last_entry_at && r.last_entry_at >= weekAgo
                return (
                  <tr key={r.user_id} className={`border-b border-[#1f1f1f] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
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
                    <td className="px-6 py-4 text-gray-300 font-semibold">{r.total_entries}</td>
                    <td className="px-6 py-4 text-gray-400">{r.checkin_entries}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{r.first_entry_at ? fmtDate(r.first_entry_at, tz) : "—"}</td>
                    <td className="px-6 py-4 text-xs">
                      <span className={isActive ? "text-[#e378ac] font-semibold" : "text-gray-500"}>
                        {r.last_entry_at ? fmtDateTime(r.last_entry_at, tz) : "—"}
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
