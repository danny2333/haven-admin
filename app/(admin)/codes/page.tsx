import CodesTable from "@/components/CodesTable"
import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

async function generateCodes(formData: FormData) {
  "use server"
  const count = Math.min(Math.max(parseInt(formData.get("count") as string) || 10, 1), 200)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const CHARS = "ABCDEFGHJKLMNPQRTUVWXYZ2346789"
  const randomCode = () => {
    const bytes = new Uint8Array(8)
    crypto.getRandomValues(bytes)
    let code = ""
    for (let i = 0; i < 8; i++) {
      if (i === 4) code += "-"
      code += CHARS[bytes[i] % CHARS.length]
    }
    return code
  }
  const rows = Array.from({ length: count }, () => ({ code: randomCode(), expires_at: expiresAt }))
  await supabase.from("invite_codes").insert(rows)
  revalidatePath("/codes")
}

async function deleteCode(id: string) {
  "use server"
  await supabase.from("invite_codes").delete().eq("id", id)
  revalidatePath("/codes")
}

async function deleteAllUnused() {
  "use server"
  // Only delete unused codes that have already expired — never valid future codes
  await supabase
    .from("invite_codes")
    .delete()
    .is("used_by", null)
    .is("used_at", null)
    .lt("expires_at", new Date().toISOString())
  revalidatePath("/codes")
}

async function deleteAllExpired() {
  "use server"
  // used_by alone isn't enough — it gets cleared to null if the redeemer's
  // account is later deleted, but used_at stays set as the permanent record
  // that the code really was used. Checking only used_by could delete a
  // genuinely-used code that just happens to belong to a deleted account.
  await supabase
    .from("invite_codes")
    .delete()
    .is("used_by", null)
    .is("used_at", null)
    .lt("expires_at", new Date().toISOString())
  revalidatePath("/codes")
}

export default async function Codes() {
  const [
    { data: rawCodes, error },
    { count: unusedCount },
    { count: usedCount },
  ] = await Promise.all([
    supabase
      .from("invite_codes")
      .select("id, code, created_at, used_at, expires_at, created_by, used_by")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("invite_codes").select("id", { count: "exact", head: true }).is("used_by", null).gte("expires_at", new Date().toISOString()),
    supabase.from("invite_codes").select("id", { count: "exact", head: true }).not("used_by", "is", null),
  ])

  if (error) console.error("Codes query error:", error)

  // Fetch profiles for all creators/redeemers in one query
  const allUserIds = [...new Set([
    ...(rawCodes ?? []).map((c: any) => c.created_by).filter(Boolean),
    ...(rawCodes ?? []).map((c: any) => c.used_by).filter(Boolean),
  ])]
  const { data: profiles } = allUserIds.length > 0
    ? await supabase.from("profiles").select("id, username").in("id", allUserIds)
    : { data: [] }
  const profileMap: Record<string, { id: string; username: string }> = {}
  for (const p of profiles ?? []) profileMap[p.id] = p

  const codes = (rawCodes ?? []).map((c: any) => ({
    id: c.id,
    code: c.code,
    created_at: c.created_at,
    used_at: c.used_at,
    expires_at: c.expires_at ?? null,
    creator: c.created_by && profileMap[c.created_by] ? profileMap[c.created_by] : null,
    redeemer: c.used_by && profileMap[c.used_by] ? profileMap[c.used_by] : null,
  }))

  const now = new Date().toISOString()
  // Matches deleteAllExpired's own filter exactly (used_at, not just
  // redeemer/used_by, which gets cleared to null if the account is deleted)
  // so the count shown always matches what the button actually deletes.
  const expiredCount = codes.filter((c: any) => !c.used_at && c.expires_at && c.expires_at < now).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-white mb-1">Invite Codes</h2>
          <p className="text-gray-500 text-sm">
            {unusedCount ?? 0} active · {usedCount ?? 0} used
            {expiredCount > 0 && <span className="text-orange-400"> · {expiredCount} expired</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {expiredCount > 0 && (
            <form action={deleteAllExpired}>
              <button className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 text-sm font-bold px-4 py-2 rounded-xl transition">
                Delete {expiredCount} expired
              </button>
            </form>
          )}

          <form action={generateCodes} className="flex items-center gap-2">
            <input
              type="number"
              name="count"
              defaultValue={10}
              min={1}
              max={200}
              className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-[#e378ac]"
            />
            <button className="bg-[#e378ac] hover:bg-[#c0547a] text-white text-sm font-bold px-4 py-2 rounded-xl transition">
              + Generate
            </button>
          </form>
        </div>
      </div>

      <CodesTable codes={codes} onDelete={deleteCode} />
    </div>
  )
}
