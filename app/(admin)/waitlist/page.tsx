import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

async function updateWaitlist(id: string, status: string) {
  "use server"
  await supabase.from("waitlist").update({ status }).eq("id", id)
  revalidatePath("/waitlist")
}

async function approveAndGenerateCode(id: string) {
  "use server"
  const CHARS = "ABCDEFGHJKLMNPQRTUVWXYZ2346789"
  let code = ""
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += "-"
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  await supabase.from("invite_codes").insert([{ code }])
  await supabase.from("waitlist").update({ status: "approved" }).eq("id", id)
  revalidatePath("/waitlist")
  // The code is now in invite_codes — go to /codes to copy and send it
}

export default async function Waitlist() {
  const { data: entries } = await supabase
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false })

  const pending = entries?.filter(e => e.status === "pending") ?? []
  const approved = entries?.filter(e => e.status === "approved") ?? []

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Waitlist</h2>
      <p className="text-gray-500 text-sm mb-6">{pending.length} pending · {approved.length} approved</p>

      <div className="flex flex-col gap-4">
        {entries?.map(entry => (
          <div key={entry.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <p className="font-bold text-white text-lg">{entry.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    entry.status === "approved" ? "bg-green-400/10 text-green-400" :
                    entry.status === "rejected" ? "bg-red-400/10 text-red-400" :
                    "bg-yellow-400/10 text-yellow-400"
                  }`}>
                    {entry.status}
                  </span>
                </div>
                <p className="text-[#e378ac] text-sm mb-3">{entry.email}</p>
                {entry.reason && (
                  <p className="text-gray-400 text-sm mb-3 bg-black/20 rounded-xl p-3">"{entry.reason}"</p>
                )}
                <div className="flex gap-4 text-xs text-gray-500">
                  {entry.instagram && <span>📸 @{entry.instagram}</span>}
                  {entry.tiktok    && <span>🎵 @{entry.tiktok}</span>}
                  {entry.twitter   && <span>🐦 @{entry.twitter}</span>}
                </div>
                <p className="text-gray-600 text-xs mt-2">{new Date(entry.created_at).toLocaleDateString()}</p>
              </div>

              {entry.status === "pending" && (
                <div className="flex flex-col gap-2 shrink-0">
                  <form action={approveAndGenerateCode.bind(null, entry.id)}>
                    <button className="bg-[#e378ac] hover:bg-[#c0547a] text-white text-sm font-bold px-4 py-2 rounded-xl w-full transition">
                      Approve + Code
                    </button>
                  </form>
                  <form action={updateWaitlist.bind(null, entry.id, "rejected")}>
                    <button className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-bold px-4 py-2 rounded-xl w-full transition">
                      Reject
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        ))}

        {entries?.length === 0 && (
          <p className="text-gray-500 text-center py-20">No waitlist entries yet</p>
        )}
      </div>
    </div>
  )
}
