import { supabase } from "@/lib/supabase"
import { fmtDateTime, getAdminTZ } from "@/lib/date"

export const revalidate = 0

const STATUS_COLOR: Record<string, string> = {
  succeeded: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  failed:    "bg-red-500/10 text-red-400 border-red-500/20",
}

export default async function SystemHealthPage() {
  const tz = await getAdminTZ()

  const [{ count: totalProfiles }, { count: withToken }, { data: jobs }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("push_tokens").select("user_id", { count: "exact", head: true }),
    supabase
      .from("cron_job_status")
      .select("jobid, jobname, schedule, active, last_status, last_run_at, last_return_message")
      .order("jobname"),
  ])

  const pushPct = totalProfiles ? Math.round(((withToken ?? 0) / totalProfiles) * 100) : 0

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">System Health</h2>
      <p className="text-gray-500 text-sm mb-8">
        Push delivery reach and scheduled job status — the things that silently break with no other signal.
      </p>

      {/* Push adoption */}
      <div className="mb-10">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-4">Push Notification Reach</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
            <p className="text-3xl font-black text-white mb-1">{totalProfiles ?? 0}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Total Users</p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
            <p className="text-3xl font-black text-white mb-1">{withToken ?? 0}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Have Push Enabled</p>
          </div>
          <div className={`rounded-2xl p-5 border ${pushPct < 50 ? "bg-red-500/5 border-red-500/30" : "bg-[#1a1a1a] border-[#2a2a2a]"}`}>
            <p className={`text-3xl font-black mb-1 ${pushPct < 50 ? "text-red-400" : "text-white"}`}>{pushPct}%</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Push Adoption</p>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-3">
          Every push-based notification (follows, likes, new posts from people you follow, invite reminders, weekly recap)
          silently reaches nobody without a registered token. Local-only notifications like streak milestones aren't affected.
        </p>
      </div>

      {/* Scheduled jobs */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-4">Scheduled Jobs</p>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-6 py-4">Job</th>
                <th className="text-left px-6 py-4">Schedule</th>
                <th className="text-left px-6 py-4">Last Run</th>
                <th className="text-left px-6 py-4">Status</th>
                <th className="text-left px-6 py-4">Result</th>
              </tr>
            </thead>
            <tbody>
              {(jobs ?? []).map((j, i) => (
                <tr key={j.jobid} className={`border-b border-[#1f1f1f] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                  <td className="px-6 py-4">
                    <p className="text-white font-semibold">{j.jobname}</p>
                    {!j.active && <p className="text-red-400 text-xs mt-0.5">inactive</p>}
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{j.schedule}</td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {j.last_run_at ? fmtDateTime(j.last_run_at, tz) : <span className="text-gray-700">never run yet</span>}
                  </td>
                  <td className="px-6 py-4">
                    {j.last_status ? (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[j.last_status] ?? "bg-white/5 text-gray-400 border-white/10"}`}>
                        {j.last_status}
                      </span>
                    ) : <span className="text-gray-700 text-xs">—</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs max-w-xs truncate">{j.last_return_message ?? "—"}</td>
                </tr>
              ))}
              {(!jobs || jobs.length === 0) && (
                <tr><td colSpan={5} className="text-center text-gray-600 py-12 text-sm">No scheduled jobs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-600 mt-3">
          Jobs that call Expo's push API directly (invite-code reminders, weekly recap) don't write to push_send_log —
          that table only captures sends made through the app's send-push edge function. "Succeeded" here means the
          SQL ran without error, not that every push was necessarily delivered.
        </p>
      </div>
    </div>
  )
}
