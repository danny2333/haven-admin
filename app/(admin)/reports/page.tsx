import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

async function banFromReport(reportId: string, userId: string) {
  "use server"
  await supabase.from("profiles").update({
    banned: true,
    ban_reason: "Banned following a user report",
    banned_at: new Date().toISOString(),
  }).eq("id", userId)
  await supabase.from("reports").update({ status: "resolved", action: "banned" }).eq("id", reportId)
  revalidatePath("/reports")
}

async function dismissReport(reportId: string) {
  "use server"
  await supabase.from("reports").update({ status: "dismissed" }).eq("id", reportId)
  revalidatePath("/reports")
}

export default async function Reports() {
  const { data: reports } = await supabase
    .from("reports")
    .select("id, reason, context, created_at, status, action, reporter_id, reported_user_id, reported_post_id")
    .order("created_at", { ascending: false })

  const userIds = [...new Set([
    ...(reports ?? []).map(r => r.reporter_id),
    ...(reports ?? []).map(r => r.reported_user_id),
  ].filter(Boolean))]

  const { data: profiles } = userIds.length > 0
    ? await supabase.from("profiles").select("id, username, email").in("id", userIds)
    : { data: [] }

  const profileMap: Record<string, { username: string; email: string }> = {}
  for (const p of profiles ?? []) {
    profileMap[p.id] = { username: p.username, email: p.email }
  }

  const pending = reports?.filter(r => !r.status || r.status === "pending") ?? []
  const resolved = reports?.filter(r => r.status && r.status !== "pending") ?? []

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Reports</h2>
      <p className="text-gray-500 text-sm mb-6">
        {pending.length} pending · {resolved.length} resolved
      </p>

      {pending.length === 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-12 text-center text-gray-600 text-sm mb-8">
          No pending reports.
        </div>
      )}

      {pending.length > 0 && (
        <div className="flex flex-col gap-4 mb-10">
          {pending.map(r => {
            const reporter = profileMap[r.reporter_id]
            const reported = profileMap[r.reported_user_id]
            return (
              <div key={r.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-gray-500">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                      {r.reported_post_id && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400">
                          post report
                        </span>
                      )}
                      {!r.reported_post_id && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#e378ac]/10 text-[#e378ac]">
                          user report
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Reported by</p>
                        <p className="text-gray-300 font-semibold">
                          @{reporter?.username ?? "unknown"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Reported user</p>
                        <p className="text-white font-semibold">
                          @{reported?.username ?? "unknown"}
                        </p>
                        {reported?.email && (
                          <p className="text-gray-500 text-xs">{reported.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="mb-2">
                      <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Reason</p>
                      <p className="text-gray-300 text-sm">{r.reason ?? "—"}</p>
                    </div>

                    {r.context && (
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Context</p>
                        <p className="text-gray-400 text-sm">{r.context}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 min-w-[120px]">
                    <form action={banFromReport.bind(null, r.id, r.reported_user_id)}>
                      <button className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold px-4 py-2.5 rounded-xl transition">
                        Ban User
                      </button>
                    </form>
                    <form action={dismissReport.bind(null, r.id)}>
                      <button className="w-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-gray-300 text-xs font-bold px-4 py-2.5 rounded-xl transition">
                        Dismiss
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {resolved.length > 0 && (
        <>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Resolved</h3>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-6 py-4">Reported User</th>
                  <th className="text-left px-6 py-4">Reason</th>
                  <th className="text-left px-6 py-4">Action Taken</th>
                  <th className="text-left px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {resolved.map((r, i) => (
                  <tr key={r.id} className={`border-b border-[#1f1f1f] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                    <td className="px-6 py-4 text-gray-300">
                      @{profileMap[r.reported_user_id]?.username ?? "unknown"}
                    </td>
                    <td className="px-6 py-4 text-gray-500 max-w-xs">
                      <p className="truncate">{r.reason ?? "—"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        r.action === "banned"
                          ? "bg-red-400/10 text-red-400"
                          : r.action === "warned"
                          ? "bg-yellow-400/10 text-yellow-400"
                          : "bg-white/5 text-gray-500"
                      }`}>
                        {r.action ?? r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
