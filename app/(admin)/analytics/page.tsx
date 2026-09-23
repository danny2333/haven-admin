import { supabase } from "@/lib/supabase"
import { getAdminTZ, localDayStart } from "@/lib/date"

function getAgeRange(dob: string | null): string {
  if (!dob) return "Unknown"
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  if (age < 18) return "Under 18"
  if (age < 25) return "18–24"
  if (age < 35) return "25–34"
  if (age < 45) return "35–44"
  return "45+"
}

function countBy<T>(arr: T[], key: (item: T) => string): Record<string, number> {
  return arr.reduce((acc, item) => {
    const k = key(item)
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

function sorted(obj: Record<string, number>): [string, number][] {
  return Object.entries(obj).sort((a, b) => b[1] - a[1])
}

export default async function Analytics() {
  const now = new Date()
  const tz = await getAdminTZ()
  const todayStart  = localDayStart(tz)
  const weekStart   = new Date(now); weekStart.setDate(now.getDate() - 7)
  const monthStart  = new Date(now); monthStart.setDate(now.getDate() - 30)

  const [
    { data: profiles },
    { count: totalPosts },
    { count: totalDailies },
    { count: newToday },
    { count: newWeek },
    { count: newMonth },
    { count: dau },
    { count: wau },
    { count: mau },
  ] = await Promise.all([
    supabase.from("profiles").select("id, date_of_birth, location, interests, is_student, created_at").limit(5000),
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("daily_posts").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekStart.toISOString()),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("last_seen_at", todayStart.toISOString()),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("last_seen_at", weekStart.toISOString()),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("last_seen_at", monthStart.toISOString()),
  ])

  const all = profiles ?? []
  const total = all.length

  // Age distribution
  const ageCounts = countBy(all, p => getAgeRange(p.date_of_birth))
  const ageOrder = ["Under 18", "18–24", "25–34", "35–44", "45+", "Unknown"]
  const ageRows = ageOrder.map(label => [label, ageCounts[label] ?? 0] as [string, number])

  // Location top 10
  const locationCounts = countBy(
    all.filter(p => p.location),
    p => p.location as string
  )
  const topLocations = sorted(locationCounts).slice(0, 10)

  // Interests
  const interestCounts: Record<string, number> = {}
  all.forEach(p => {
    if (Array.isArray(p.interests)) {
      p.interests.forEach((i: string) => { interestCounts[i] = (interestCounts[i] || 0) + 1 })
    }
  })
  const topInterests = sorted(interestCounts).slice(0, 12)

  // Student
  const studentCount    = all.filter(p => p.is_student === true).length
  const nonStudentCount = all.filter(p => p.is_student === false).length
  const studentUnknown  = total - studentCount - nonStudentCount

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Analytics</h2>
      <p className="text-gray-500 text-sm mb-8">User base overview</p>

      {/* Active users — DAU / WAU / MAU */}
      <p className="text-gray-500 text-xs uppercase tracking-wide font-bold mb-3">Active Users (opened app)</p>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "DAU · Today",      value: (dau ?? 0).toLocaleString() },
          { label: "WAU · Last 7 days", value: (wau ?? 0).toLocaleString() },
          { label: "MAU · Last 30 days", value: (mau ?? 0).toLocaleString() },
        ].map(stat => (
          <div key={stat.label} className="bg-[#1a1a1a] border border-[#e378ac]/20 rounded-2xl p-5">
            <p className="text-[#e378ac] text-xs uppercase tracking-wide font-bold mb-1">{stat.label}</p>
            <p className="text-white text-3xl font-black">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Growth & content stats */}
      <p className="text-gray-500 text-xs uppercase tracking-wide font-bold mb-3">Growth & Content</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total users",    value: total.toLocaleString() },
          { label: "New today",      value: (newToday ?? 0).toLocaleString() },
          { label: "New this week",  value: (newWeek ?? 0).toLocaleString() },
          { label: "New this month", value: (newMonth ?? 0).toLocaleString() },
          { label: "Total posts",    value: (totalPosts ?? 0).toLocaleString() },
          { label: "Total dailies",  value: (totalDailies ?? 0).toLocaleString() },
          { label: "Students",       value: `${studentCount} (${pct(studentCount)}%)` },
          { label: "Non-students",   value: `${nonStudentCount} (${pct(nonStudentCount)}%)` },
        ].map(stat => (
          <div key={stat.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
            <p className="text-gray-500 text-xs uppercase tracking-wide font-bold mb-1">{stat.label}</p>
            <p className="text-white text-2xl font-black">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Age distribution */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
          <p className="text-white font-black mb-4">Age Distribution</p>
          <div className="flex flex-col gap-3">
            {ageRows.map(([label, count]) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300 font-medium">{label}</span>
                  <span className="text-gray-500">{count} · {pct(count)}%</span>
                </div>
                <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#e378ac] rounded-full transition-all"
                    style={{ width: `${pct(count)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top locations */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
          <p className="text-white font-black mb-4">Top Locations</p>
          {topLocations.length === 0 ? (
            <p className="text-gray-600 text-sm">No location data yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {topLocations.map(([loc, count]) => (
                <div key={loc}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300 font-medium truncate max-w-[140px]">{loc}</span>
                    <span className="text-gray-500">{count} · {pct(count)}%</span>
                  </div>
                  <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#e378ac] rounded-full"
                      style={{ width: `${pct(count)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top interests */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
          <p className="text-white font-black mb-4">Top Interests</p>
          {topInterests.length === 0 ? (
            <p className="text-gray-600 text-sm">No interest data yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {topInterests.map(([interest, count]) => (
                <div key={interest}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300 font-medium capitalize">{interest.replace(/_/g, " ")}</span>
                    <span className="text-gray-500">{count} · {pct(count)}%</span>
                  </div>
                  <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#e378ac] rounded-full"
                      style={{ width: `${Math.round((count / (topInterests[0]?.[1] || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
