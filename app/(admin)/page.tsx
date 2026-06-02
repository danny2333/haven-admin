import { supabase } from "@/lib/supabase"

async function getStats() {
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const [users, posts, waitlist, requests, codes, dailyToday, activeStreaks] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("waitlist").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("code_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("invite_codes").select("id", { count: "exact", head: true }).is("used_by", null),
    supabase.from("daily_posts").select("id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gt("current_streak", 0),
  ])
  return {
    users: users.count ?? 0,
    posts: posts.count ?? 0,
    waitlist: waitlist.count ?? 0,
    requests: requests.count ?? 0,
    codesLeft: codes.count ?? 0,
    dailyToday: dailyToday.count ?? 0,
    activeStreaks: activeStreaks.count ?? 0,
  }
}

export default async function Dashboard() {
  const stats = await getStats()

  const cards = [
    { label: "Total Users",        value: stats.users,        color: "text-[#e378ac]" },
    { label: "Total Posts",        value: stats.posts,        color: "text-purple-400" },
    { label: "Daily Posts Today",  value: stats.dailyToday,   color: "text-orange-400" },
    { label: "Active Streaks",     value: stats.activeStreaks, color: "text-yellow-400" },
    { label: "Waitlist Pending",   value: stats.waitlist,     color: "text-blue-400" },
    { label: "Unused Codes Left",  value: stats.codesLeft,    color: "text-green-400" },
  ]

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Dashboard</h2>
      <p className="text-gray-500 text-sm mb-8">Overview of Haven</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(card => (
          <div key={card.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
            <p className="text-gray-500 text-sm mb-2">{card.label}</p>
            <p className={`text-4xl font-black ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
