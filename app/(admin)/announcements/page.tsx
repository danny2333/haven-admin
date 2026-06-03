import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

async function createAnnouncement(formData: FormData) {
  "use server"
  const title = (formData.get("title") as string)?.trim()
  const message = (formData.get("message") as string)?.trim()
  const type = (formData.get("type") as string) || "info"
  if (!title || !message) return
  await supabase.from("announcements").insert([{ title, message, type, is_active: true }])
  revalidatePath("/announcements")
}

async function toggleAnnouncement(id: string, current: boolean) {
  "use server"
  await supabase.from("announcements").update({ is_active: !current }).eq("id", id)
  revalidatePath("/announcements")
}

async function deleteAnnouncement(id: string) {
  "use server"
  await supabase.from("announcements").delete().eq("id", id)
  revalidatePath("/announcements")
}

const TYPE_STYLES: Record<string, { label: string; classes: string }> = {
  info:    { label: "Info",    classes: "bg-[#e378ac]/10 text-[#e378ac]" },
  update:  { label: "Update",  classes: "bg-blue-400/10 text-blue-400" },
  warning: { label: "Warning", classes: "bg-yellow-400/10 text-yellow-400" },
  urgent:  { label: "Urgent",  classes: "bg-red-400/10 text-red-400" },
}

export default async function Announcements() {
  const [{ data: announcements, error }, { count: activeCount }, { count: inactiveCount }] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, message, type, is_active, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("announcements").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("announcements").select("id", { count: "exact", head: true }).eq("is_active", false),
  ])

  if (error) console.error("Announcements query error:", error)

  const active   = announcements?.filter(a => a.is_active) ?? []
  const inactive = announcements?.filter(a => !a.is_active) ?? []

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Announcements</h2>
      <p className="text-gray-500 text-sm mb-8">{activeCount ?? 0} live · {inactiveCount ?? 0} inactive</p>

      {/* Create form */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 mb-8 max-w-2xl">
        <p className="text-white font-bold mb-4">New Announcement</p>
        <form action={createAnnouncement} className="flex flex-col gap-4">
          <input
            name="title"
            required
            placeholder="Title"
            className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#e378ac] transition"
          />
          <textarea
            name="message"
            required
            placeholder="Write your message to all Haven users…"
            rows={4}
            className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#e378ac] transition resize-none"
          />
          <div className="flex items-center gap-3">
            <select
              name="type"
              defaultValue="info"
              className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#e378ac] transition"
            >
              <option value="info">Info</option>
              <option value="update">Update</option>
              <option value="warning">Warning</option>
              <option value="urgent">Urgent</option>
            </select>
            <button
              type="submit"
              className="bg-[#e378ac] hover:bg-[#d4689d] text-white text-sm font-bold px-6 py-3 rounded-xl transition"
            >
              Post Announcement
            </button>
          </div>
        </form>
      </div>

      {/* Active announcements */}
      {active.length > 0 && (
        <div className="mb-8">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-3">Live</p>
          <div className="flex flex-col gap-3">
            {active.map(a => (
              <AnnouncementCard
                key={a.id}
                announcement={a}
                toggleAnnouncement={toggleAnnouncement}
                deleteAnnouncement={deleteAnnouncement}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive announcements */}
      {inactive.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-bold mb-3">Inactive</p>
          <div className="flex flex-col gap-3">
            {inactive.map(a => (
              <AnnouncementCard
                key={a.id}
                announcement={a}
                toggleAnnouncement={toggleAnnouncement}
                deleteAnnouncement={deleteAnnouncement}
              />
            ))}
          </div>
        </div>
      )}

      {(!announcements || announcements.length === 0) && (
        <p className="text-gray-600 text-sm text-center py-12">No announcements yet.</p>
      )}
    </div>
  )
}

function AnnouncementCard({
  announcement: a,
  toggleAnnouncement,
  deleteAnnouncement,
}: {
  announcement: any
  toggleAnnouncement: (id: string, current: boolean) => Promise<void>
  deleteAnnouncement: (id: string) => Promise<void>
}) {
  const t = TYPE_STYLES[a.type] ?? TYPE_STYLES.info
  return (
    <div className={`bg-[#1a1a1a] border rounded-2xl p-5 ${a.is_active ? "border-[#2a2a2a]" : "border-[#1f1f1f] opacity-60"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${t.classes}`}>
              {t.label}
            </span>
            {a.is_active && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 font-semibold">
                Live
              </span>
            )}
            <span className="text-gray-600 text-xs">
              {new Date(a.created_at).toLocaleDateString()}
            </span>
          </div>
          <p className="text-white font-bold mb-1">{a.title}</p>
          <p className="text-gray-400 text-sm leading-relaxed">{a.message}</p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <form action={toggleAnnouncement.bind(null, a.id, a.is_active)}>
            <button className={`w-full text-xs font-bold px-4 py-2 rounded-xl transition ${
              a.is_active
                ? "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                : "bg-green-400/10 hover:bg-green-400/20 text-green-400"
            }`}>
              {a.is_active ? "Deactivate" : "Activate"}
            </button>
          </form>
          <form action={deleteAnnouncement.bind(null, a.id)}>
            <button className="w-full text-xs font-bold px-4 py-2 rounded-xl bg-red-400/10 hover:bg-red-400/20 text-red-400 transition">
              Delete
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
