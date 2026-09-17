import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { getAdminTZ } from "@/lib/date"

const TIMEZONES = [
  { label: "UTC",                              value: "UTC" },
  { label: "Eastern (ET) — New York",          value: "America/New_York" },
  { label: "Central (CT) — Chicago",           value: "America/Chicago" },
  { label: "Mountain (MT) — Denver",           value: "America/Denver" },
  { label: "Pacific (PT) — Los Angeles",       value: "America/Los_Angeles" },
  { label: "Alaska (AKT)",                     value: "America/Anchorage" },
  { label: "Hawaii (HT)",                      value: "Pacific/Honolulu" },
  { label: "London (GMT/BST)",                 value: "Europe/London" },
  { label: "Paris / Berlin (CET/CEST)",        value: "Europe/Paris" },
  { label: "Dubai (GST, UTC+4)",               value: "Asia/Dubai" },
  { label: "India (IST, UTC+5:30)",            value: "Asia/Kolkata" },
  { label: "Bangkok / Jakarta (WIB/ICT, +7)",  value: "Asia/Bangkok" },
  { label: "Singapore / KL (SGT/MYT, +8)",     value: "Asia/Singapore" },
  { label: "Tokyo / Seoul (JST/KST, +9)",      value: "Asia/Tokyo" },
  { label: "Sydney (AEDT/AEST)",               value: "Australia/Sydney" },
  { label: "Lagos (WAT, UTC+1)",               value: "Africa/Lagos" },
]

async function toggleBeta(value: string) {
  "use server"
  const next = value === "true" ? "false" : "true"
  await supabase.from("app_settings").update({ value: next }).eq("key", "beta_open")
  revalidatePath("/settings")
}

async function saveTZ(formData: FormData) {
  "use server"
  const tz = formData.get("tz") as string
  if (!tz) return

  const { data: existing } = await supabase
    .from("app_settings")
    .select("key")
    .eq("key", "admin_timezone")
    .maybeSingle()

  if (existing) {
    await supabase.from("app_settings").update({ value: tz }).eq("key", "admin_timezone")
  } else {
    await supabase.from("app_settings").insert({ key: "admin_timezone", value: tz })
  }

  for (const p of ["/settings", "/dailies", "/posts", "/users", "/waitlist", "/reports", "/communities", "/announcements", "/requests"]) {
    revalidatePath(p)
  }
}

export default async function Settings() {
  const { data: settings } = await supabase.from("app_settings").select("*")
  const betaOpen = settings?.find(s => s.key === "beta_open")?.value === "true"
  const currentTZ = await getAdminTZ()

  const nowPreview = new Date().toLocaleString("en-US", {
    timeZone: currentTZ, month: "short", day: "numeric",
    year: "numeric", hour: "numeric", minute: "2-digit",
  })

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Settings</h2>
      <p className="text-gray-500 text-sm mb-8">Control Haven from here</p>

      <div className="flex flex-col gap-4 max-w-lg">

        {/* Beta toggle */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-white mb-1">Beta Signups</p>
              <p className="text-gray-500 text-sm">
                {betaOpen
                  ? "Open — anyone with a code can sign up"
                  : "Paused — no new signups even with a valid code"}
              </p>
            </div>
            <form action={toggleBeta.bind(null, betaOpen ? "true" : "false")}>
              <button className={`relative w-14 h-7 rounded-full transition-colors ${betaOpen ? "bg-[#e378ac]" : "bg-gray-700"}`}>
                <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${betaOpen ? "translate-x-8" : "translate-x-1"}`} />
              </button>
            </form>
          </div>
          <div className={`mt-4 text-xs px-3 py-2 rounded-xl ${betaOpen ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"}`}>
            Status: {betaOpen ? "✓ Signups are OPEN" : "✗ Signups are PAUSED"}
          </div>
        </div>

        {/* Timezone picker */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
          <p className="font-bold text-white mb-1">Admin Timezone</p>
          <p className="text-gray-500 text-sm mb-4">
            All timestamps across the admin panel display in this timezone.
          </p>

          <div className="bg-[#e378ac]/10 border border-[#e378ac]/20 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-xl">🕐</span>
            <div>
              <p className="text-[#e378ac] text-[10px] font-black uppercase tracking-wider">Current admin time</p>
              <p className="text-white text-sm font-semibold">{nowPreview}</p>
              <p className="text-gray-500 text-[11px] mt-0.5">{currentTZ}</p>
            </div>
          </div>

          <form action={saveTZ} className="flex gap-2">
            <select
              name="tz"
              defaultValue={currentTZ}
              className="flex-1 bg-[#111] border border-[#333] text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#e378ac]"
            >
              {TIMEZONES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#e378ac] text-white text-sm font-bold hover:bg-[#d4609a] transition whitespace-nowrap"
            >
              Save
            </button>
          </form>

          <p className="text-gray-600 text-[11px] mt-3">
            Not in the list? Set <code className="bg-black/40 px-1 rounded">ADMIN_TIMEZONE</code> in{" "}
            <code className="bg-black/40 px-1 rounded">.env.local</code> with any IANA tz string (e.g.{" "}
            <code className="bg-black/40 px-1 rounded">America/Chicago</code>).
          </p>
        </div>

        {/* All settings rows */}
        {settings && settings.length > 0 && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
            <p className="text-gray-500 text-xs uppercase tracking-wide px-6 py-4 border-b border-[#2a2a2a]">All settings</p>
            {settings.map(s => (
              <div key={s.key} className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f] last:border-0">
                <span className="font-mono text-sm text-gray-400">{s.key}</span>
                <span className="font-mono text-sm text-white bg-black/30 px-3 py-1 rounded-lg">{s.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
