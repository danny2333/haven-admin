import { supabase } from "@/lib/supabase"

export default async function Streaks() {
  const { data: top } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, current_streak, longest_streak")
    .gt("current_streak", 0)
    .order("current_streak", { ascending: false })
    .limit(50)

  const { data: allTime } = await supabase
    .from("profiles")
    .select("id, username, display_name, longest_streak, current_streak")
    .gt("longest_streak", 0)
    .order("longest_streak", { ascending: false })
    .limit(20)

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Streaks</h2>
      <p className="text-gray-500 text-sm mb-8">Celebrate your most consistent members</p>

      {/* Current streaks */}
      <div className="mb-10">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-4">🔥 Active Streaks</p>
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
              {top?.map((u, i) => (
                <tr key={u.id} className={`border-b border-[#1f1f1f] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-black ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-gray-600"}`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-white font-semibold">{u.display_name || `@${u.username}`}</p>
                    <p className="text-gray-500 text-xs">@{u.username}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[#e378ac] font-black text-base">
                      🔥 {u.current_streak} day{u.current_streak !== 1 ? "s" : ""}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    🏆 {u.longest_streak} day{u.longest_streak !== 1 ? "s" : ""}
                  </td>
                </tr>
              ))}
              {(!top || top.length === 0) && (
                <tr>
                  <td colSpan={4} className="text-center text-gray-600 py-12 text-sm">No active streaks yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* All-time records */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-4">🏆 All-Time Records</p>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-6 py-4">Rank</th>
                <th className="text-left px-6 py-4">User</th>
                <th className="text-left px-6 py-4">Longest Streak</th>
                <th className="text-left px-6 py-4">Currently</th>
              </tr>
            </thead>
            <tbody>
              {allTime?.map((u, i) => (
                <tr key={u.id} className={`border-b border-[#1f1f1f] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-black ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-gray-600"}`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-white font-semibold">{u.display_name || `@${u.username}`}</p>
                    <p className="text-gray-500 text-xs">@{u.username}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-yellow-400 font-black text-base">
                      🏆 {u.longest_streak} day{u.longest_streak !== 1 ? "s" : ""}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {u.current_streak > 0
                      ? <span className="text-xs px-2 py-1 rounded-full bg-[#e378ac]/10 text-[#e378ac] font-semibold">🔥 {u.current_streak} day streak</span>
                      : <span className="text-gray-600 text-xs">Inactive</span>
                    }
                  </td>
                </tr>
              ))}
              {(!allTime || allTime.length === 0) && (
                <tr>
                  <td colSpan={4} className="text-center text-gray-600 py-12 text-sm">No streak records yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
