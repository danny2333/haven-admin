import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

async function toggleBeta(value: string) {
  "use server"
  const next = value === "true" ? "false" : "true"
  await supabase.from("app_settings").update({ value: next }).eq("key", "beta_open")
  revalidatePath("/settings")
}

export default async function Settings() {
  const { data: settings } = await supabase.from("app_settings").select("*")
  const betaOpen = settings?.find(s => s.key === "beta_open")?.value === "true"

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
