import { fmtDate, fmtTime, getAdminTZ } from "@/lib/date"
import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import CrashRow from "@/components/CrashRow"

export const revalidate = 0

async function resolveCrash(id: string, resolved: boolean) {
  "use server"
  await supabase.from("crash_reports").update({ resolved }).eq("id", id)
  revalidatePath("/crashes", "page")
}

async function deleteCrash(id: string) {
  "use server"
  await supabase.from("crash_reports").delete().eq("id", id)
  revalidatePath("/crashes", "page")
}

const FILTERS = [
  { label: "Unresolved", value: "unresolved" },
  { label: "All",        value: "all" },
  { label: "Resolved",   value: "resolved" },
]

export default async function Crashes({ searchParams }: { searchParams: { filter?: string } }) {
  const tz = await getAdminTZ()
  const filter = FILTERS.find(f => f.value === searchParams.filter)?.value ?? "unresolved"

  let query = supabase.from("crash_reports").select("*").order("created_at", { ascending: false }).limit(200)
  if (filter === "unresolved") query = query.eq("resolved", false)
  if (filter === "resolved") query = query.eq("resolved", true)

  const [{ data: crashes, error }, { count: unresolvedCount }] = await Promise.all([
    query,
    supabase.from("crash_reports").select("id", { count: "exact", head: true }).eq("resolved", false),
  ])

  if (error) console.error("Crashes query error:", error)

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Crashes</h2>
      <p className="text-gray-500 text-sm mb-6">
        {unresolvedCount ?? 0} unresolved — every uncaught error, who it happened to, and the stack.
      </p>

      <div className="flex gap-2 mb-6">
        {FILTERS.map(f => (
          <a
            key={f.value}
            href={`/crashes?filter=${f.value}`}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
              filter === f.value
                ? "bg-[#e378ac] text-white"
                : "bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#2a2a2a]"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {(crashes ?? []).map(c => (
          <CrashRow
            key={c.id}
            crash={c}
            dateStr={fmtDate(c.created_at, tz)}
            timeStr={fmtTime(c.created_at, tz)}
            onResolve={resolveCrash.bind(null, c.id, !c.resolved)}
            onDelete={deleteCrash.bind(null, c.id)}
          />
        ))}
        {(crashes ?? []).length === 0 && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-6 py-12 text-center text-gray-600">
            {filter === "unresolved" ? "No unresolved crashes 🎉" : "No crashes to show"}
          </div>
        )}
      </div>
    </div>
  )
}
