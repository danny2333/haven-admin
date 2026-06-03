import { supabase } from "@/lib/supabase"
import { sendApprovalEmail } from "@/lib/email"
import { revalidatePath } from "next/cache"

async function updateWaitlist(id: string, status: string) {
  "use server"
  await supabase.from("waitlist").update({ status }).eq("id", id)
  revalidatePath("/waitlist", "page")
}

async function approveAndGenerateCode(id: string) {
  "use server"
  const CHARS = "ABCDEFGHJKLMNPQRTUVWXYZ2346789"
  let code = ""
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += "-"
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }

  // Fetch the entry so we have the email + name to send to
  const { data: entry } = await supabase
    .from("waitlist")
    .select("email, name")
    .eq("id", id)
    .single()

  await supabase.from("invite_codes").insert([{ code }])
  await supabase.from("waitlist").update({ status: "approved" }).eq("id", id)

  // Send approval email with the code
  if (entry?.email) {
    try {
      await sendApprovalEmail({ to: entry.email, name: entry.name || "friend", code })
    } catch (e) {
      console.error("Failed to send approval email:", e)
      // Don't block the approval if email fails
    }
  }

  revalidatePath("/waitlist", "page")
}

const SOCIALS = [
  {
    key: "instagram",
    label: "Instagram",
    icon: "📸",
    url: (h: string) => `https://instagram.com/${h}`,
    color: "text-pink-400",
    bg: "bg-pink-400/10 border-pink-400/20",
  },
  {
    key: "tiktok",
    label: "TikTok",
    icon: "🎵",
    url: (h: string) => `https://tiktok.com/@${h}`,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10 border-cyan-400/20",
  },
  {
    key: "twitter",
    label: "X / Twitter",
    icon: "🐦",
    url: (h: string) => `https://x.com/${h}`,
    color: "text-sky-400",
    bg: "bg-sky-400/10 border-sky-400/20",
  },
]

export default async function Waitlist() {
  const [
    { data: entries, error },
    { count: pendingCount },
    { count: approvedCount },
    { count: rejectedCount },
  ] = await Promise.all([
    supabase.from("waitlist").select("*").order("created_at", { ascending: false }),
    supabase.from("waitlist").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("waitlist").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("waitlist").select("id", { count: "exact", head: true }).eq("status", "rejected"),
  ])

  if (error) {
    return (
      <div>
        <h2 className="text-2xl font-black text-white mb-1">Waitlist</h2>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-red-400 text-sm">
          Failed to load waitlist: {error.message}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Waitlist</h2>
      <p className="text-gray-500 text-sm mb-6">
        {pendingCount ?? 0} pending · {approvedCount ?? 0} approved · {rejectedCount ?? 0} rejected
      </p>

      <div className="flex flex-col gap-5">
        {entries?.map(entry => {
          const hasSocials = entry.instagram || entry.tiktok || entry.twitter

          return (
            <div
              key={entry.id}
              className={`bg-[#1a1a1a] border rounded-2xl overflow-hidden ${
                entry.status === "approved" ? "border-green-500/30" :
                entry.status === "rejected" ? "border-red-500/20 opacity-60" :
                "border-[#2a2a2a]"
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-4 p-6 pb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <p className="font-black text-white text-xl">{entry.name}</p>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      entry.status === "approved" ? "bg-green-400/10 text-green-400" :
                      entry.status === "rejected" ? "bg-red-400/10 text-red-400" :
                      "bg-yellow-400/10 text-yellow-400"
                    }`}>
                      {entry.status}
                    </span>
                  </div>
                  <a
                    href={`mailto:${entry.email}`}
                    className="text-[#e378ac] text-sm hover:underline"
                  >
                    {entry.email}
                  </a>
                  <p className="text-gray-600 text-xs mt-1">
                    Applied {new Date(entry.created_at).toLocaleDateString("en-US", {
                      month: "long", day: "numeric", year: "numeric",
                      hour: "numeric", minute: "2-digit",
                    })}
                  </p>
                </div>

                {entry.status === "pending" && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <form action={approveAndGenerateCode.bind(null, entry.id)}>
                      <button className="bg-[#e378ac] hover:bg-[#c0547a] text-white text-sm font-bold px-5 py-2.5 rounded-xl w-full transition">
                        Approve + Code
                      </button>
                    </form>
                    <form action={updateWaitlist.bind(null, entry.id, "rejected")}>
                      <button className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-bold px-5 py-2.5 rounded-xl w-full transition">
                        Reject
                      </button>
                    </form>
                  </div>
                )}

                {entry.status === "rejected" && (
                  <form action={updateWaitlist.bind(null, entry.id, "pending")}>
                    <button className="text-gray-500 hover:text-white border border-[#2a2a2a] hover:border-gray-500 text-xs font-bold px-4 py-2 rounded-xl transition">
                      Undo
                    </button>
                  </form>
                )}
              </div>

              {/* Reason */}
              {entry.reason ? (
                <div className="px-6 pb-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Why they want to join
                  </p>
                  <p className="text-gray-200 text-sm leading-relaxed bg-black/30 rounded-xl p-4 border border-white/5 whitespace-pre-wrap">
                    "{entry.reason}"
                  </p>
                </div>
              ) : (
                <div className="px-6 pb-4">
                  <p className="text-gray-600 text-sm italic">No reason provided</p>
                </div>
              )}

              {/* Social handles */}
              {hasSocials && (
                <div className="px-6 pb-5">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Socials — click to verify
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SOCIALS.map(s => {
                      const handle = entry[s.key]
                      if (!handle) return null
                      return (
                        <a
                          key={s.key}
                          href={s.url(handle)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition hover:opacity-80 ${s.bg} ${s.color}`}
                        >
                          <span>{s.icon}</span>
                          <span>@{handle}</span>
                          <span className="text-xs opacity-60">↗</span>
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}

              {!hasSocials && (
                <div className="px-6 pb-5">
                  <p className="text-gray-700 text-xs italic">No socials provided</p>
                </div>
              )}
            </div>
          )
        })}

        {(!entries || entries.length === 0) && (
          <p className="text-gray-500 text-center py-20">No waitlist entries yet</p>
        )}
      </div>
    </div>
  )
}
