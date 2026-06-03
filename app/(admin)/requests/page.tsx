import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

async function updateRequest(id: string, status: string) {
  "use server"
  await supabase.from("code_requests").update({ status }).eq("id", id)
  revalidatePath("/requests")
}

export default async function Requests() {
  const [{ data: requests, error }, { count: pendingCount }] = await Promise.all([
    supabase
      .from("code_requests")
      .select(`id, status, requested_at, profile:user_id(username, email)`)
      .order("requested_at", { ascending: false }),
    supabase.from("code_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ])

  if (error) console.error("Requests query error:", error)

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Code Requests</h2>
      <p className="text-gray-500 text-sm mb-6">{pendingCount ?? 0} pending</p>

      <div className="flex flex-col gap-3">
        {requests?.map(r => {
          const profile = r.profile as any
          const daysWaiting = Math.floor((Date.now() - new Date(r.requested_at).getTime()) / 86400000)

          return (
            <div key={r.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-white">@{profile?.username}</p>
                <p className="text-gray-500 text-sm">{profile?.email}</p>
                <p className="text-gray-600 text-xs mt-1">
                  Requested {daysWaiting === 0 ? "today" : `${daysWaiting} day${daysWaiting !== 1 ? "s" : ""} ago`}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  r.status === "approved" ? "bg-green-400/10 text-green-400" :
                  r.status === "rejected" ? "bg-red-400/10 text-red-400" :
                  "bg-yellow-400/10 text-yellow-400"
                }`}>
                  {r.status}
                </span>

                {r.status === "pending" && (
                  <>
                    <form action={updateRequest.bind(null, r.id, "approved")}>
                      <button className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 text-sm font-bold px-4 py-2 rounded-xl transition">
                        Approve
                      </button>
                    </form>
                    <form action={updateRequest.bind(null, r.id, "rejected")}>
                      <button className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-bold px-3 py-2 rounded-xl transition">
                        Reject
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          )
        })}

        {requests?.length === 0 && (
          <p className="text-gray-500 text-center py-20">No code requests yet</p>
        )}
      </div>
    </div>
  )
}
