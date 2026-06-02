import { supabase } from "@/lib/supabase"

export default async function Daily() {
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setUTCHours(0, 0, 0, 0)

  // Today's daily posts with profile + streak info
  const { data: todayPosts } = await supabase
    .from("daily_posts")
    .select("id, created_at, expires_at, user_id, profiles(username, display_name, avatar_url, current_streak, longest_streak)")
    .gte("created_at", todayStart.toISOString())
    .order("created_at", { ascending: false })

  // All active streaks summary
  const { data: streakProfiles } = await supabase
    .from("profiles")
    .select("id, username, current_streak, longest_streak")
    .gt("current_streak", 0)
    .order("current_streak", { ascending: false })

  // Last 7 days daily post counts
  const days: { label: string; date: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    d.setUTCHours(0, 0, 0, 0)
    const end = new Date(d)
    end.setUTCHours(23, 59, 59, 999)
    const { count } = await supabase
      .from("daily_posts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", d.toISOString())
      .lte("created_at", end.toISOString())
    const label = i === 0 ? "Today" : i === 1 ? "Yesterday" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    days.push({ label, date: d.toISOString(), count: count ?? 0 })
  }

  const maxCount = Math.max(...days.map(d => d.count), 1)

  const totalActiveStreaks = streakProfiles?.length ?? 0
  const avgStreak = totalActiveStreaks > 0
    ? Math.round((streakProfiles?.reduce((s, p) => s + (p.current_streak || 0), 0) ?? 0) / totalActiveStreaks)
    : 0
  const topStreak = streakProfiles?.[0]?.current_streak ?? 0

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Daily</h2>
      <p className="text-gray-500 text-sm mb-8">Daily post activity and streak data</p>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Posted Today",     value: todayPosts?.length ?? 0,  color: "text-[#e378ac]" },
          { label: "Active Streaks",   value: totalActiveStreaks,        color: "text-orange-400" },
          { label: "Avg Streak",       value: `${avgStreak}d`,          color: "text-purple-400" },
          { label: "Top Streak",       value: `${topStreak}d`,          color: "text-yellow-400" },
        ].map(c => (
          <div key={c.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
            <p className="text-gray-500 text-sm mb-2">{c.label}</p>
            <p className={`text-4xl font-black ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* 7-day bar chart */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 mb-10">
        <p className="text-white font-bold mb-6">Posts last 7 days</p>
        <div className="flex items-end gap-3 h-32">
          {days.map(d => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs text-gray-500">{d.count}</span>
              <div
                className="w-full rounded-t-lg bg-[#e378ac]/70 transition-all"
                style={{ height: `${Math.max((d.count / maxCount) * 100, d.count > 0 ? 8 : 2)}%` }}
              />
              <span className="text-xs text-gray-600 text-center leading-tight">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Today's posts */}
      <div className="mb-10">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-4">
          Today's Posts — {todayPosts?.length ?? 0}
        </p>
        {todayPosts && todayPosts.length > 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-6 py-4">User</th>
                  <th className="text-left px-6 py-4">Posted At</th>
                  <th className="text-left px-6 py-4">Current Streak</th>
                  <th className="text-left px-6 py-4">Personal Best</th>
                </tr>
              </thead>
              <tbody>
                {todayPosts.map((p, i) => {
                  const profile = p.profiles as any
                  return (
                    <tr key={p.id} className={`border-b border-[#1f1f1f] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                      <td className="px-6 py-4">
                        <p className="text-white font-semibold">{profile?.display_name || `@${profile?.username}`}</p>
                        <p className="text-gray-500 text-xs">@{profile?.username}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[#e378ac] font-bold">
                          🔥 {profile?.current_streak ?? 0} day{profile?.current_streak !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        🏆 {profile?.longest_streak ?? 0} day{profile?.longest_streak !== 1 ? "s" : ""}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-12 text-center text-gray-600 text-sm">
            No one has posted a daily today yet.
          </div>
        )}
      </div>

      {/* All active streaks */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-4">
          All Active Streaks — {totalActiveStreaks}
        </p>
        {streakProfiles && streakProfiles.length > 0 ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-6 py-4">Rank</th>
                  <th className="text-left px-6 py-4">User</th>
                  <th className="text-left px-6 py-4">Current Streak</th>
                  <th className="text-left px-6 py-4">Personal Best</th>
                </tr>
              </thead>
              <tbody>
                {streakProfiles.map((u, i) => (
                  <tr key={u.id} className={`border-b border-[#1f1f1f] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                    <td className="px-6 py-4 text-gray-600 font-bold text-xs">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </td>
                    <td className="px-6 py-4 text-gray-300">@{u.username}</td>
                    <td className="px-6 py-4">
                      <span className="text-[#e378ac] font-bold">🔥 {u.current_streak}d</span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">🏆 {u.longest_streak}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-12 text-center text-gray-600 text-sm">
            No active streaks yet.
          </div>
        )}
      </div>
    </div>
  )
}
