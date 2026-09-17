import RequestActions from "@/components/RequestActions"
import { fmtDate, fmtTime, getAdminTZ } from "@/lib/date"
import { supabase } from "@/lib/supabase"

export const revalidate = 0

export default async function Requests() {
  const tz = await getAdminTZ()
  const [{ data: requests, error }, { count: pendingCount }] = await Promise.all([
    supabase
      .from("code_requests")
      .select(`id, status, requested_at, reject_reason, requested_count, approved_count, reason, user_id, profile:user_id(id, username, email)`)
      .order("requested_at", { ascending: false }),
    supabase.from("code_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ])

  if (error) console.error("Requests query error:", error)

  const pending  = requests?.filter(r => r.status === "pending") ?? []
  const resolved = requests?.filter(r => r.status !== "pending") ?? []

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Code Requests</h2>
      <p className="text-gray-500 text-sm mb-6">{pendingCount ?? 0} pending</p>

      {pending.length === 0 && resolved.length === 0 && (
        <p className="text-gray-500 text-center py-20">No code requests yet</p>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div className="flex flex-col gap-3 mb-10">
          {pending.map(r => {
            const profile = r.profile as any
            const daysWaiting = Math.floor((Date.now() - new Date(r.requested_at).getTime()) / 86400000)
            return (
              <div key={r.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-white">@{profile?.username}</p>
                  <p className="text-gray-500 text-sm">{profile?.email}</p>
                  <p className="text-gray-600 text-xs mt-1">
                    Requested {daysWaiting === 0 ? "today" : `${daysWaiting} day${daysWaiting !== 1 ? "s" : ""} ago`}
                    {(r as any).requested_count && (
                      <span className="ml-2 text-[#e378ac] font-semibold">· wants {(r as any).requested_count} codes</span>
                    )}
                  </p>
                  {(r as any).reason && (
                    <p className="text-gray-400 text-xs mt-2 italic max-w-sm">"{(r as any).reason}"</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs px-2 py-1 rounded-full font-semibold bg-yellow-400/10 text-yellow-400">
                    pending
                  </span>
                  <RequestActions
                    requestId={r.id}
                    userId={r.user_id}
                    email={profile?.email ?? ""}
                    username={profile?.username ?? ""}
                    requestedCount={(r as any).requested_count ?? undefined}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Resolved</h3>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-6 py-4">User</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-left px-6 py-4">Reason</th>
                  <th className="text-left px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {resolved.map((r, i) => {
                  const profile = r.profile as any
                  return (
                    <tr key={r.id} className={`border-b border-[#1f1f1f] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                      <td className="px-6 py-4">
                        <p className="text-white font-semibold">@{profile?.username}</p>
                        <p className="text-gray-600 text-xs">{profile?.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          r.status === "approved" ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 max-w-xs">
                        <p className="truncate">{r.reject_reason ?? "—"}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        <div>{fmtDate(r.requested_at, tz)}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{fmtTime(r.requested_at, tz)}</div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
