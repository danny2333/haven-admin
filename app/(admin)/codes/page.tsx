import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

async function generateCodes(count: number) {
  "use server"
  const CHARS = "ABCDEFGHJKLMNPQRTUVWXYZ2346789"
  const randomCode = () => {
    let code = ""
    for (let i = 0; i < 8; i++) {
      if (i === 4) code += "-"
      code += CHARS[Math.floor(Math.random() * CHARS.length)]
    }
    return code
  }
  const rows = Array.from({ length: count }, () => ({ code: randomCode() }))
  await supabase.from("invite_codes").insert(rows)
  revalidatePath("/codes")
}

export default async function Codes() {
  const { data: codes } = await supabase
    .from("invite_codes")
    .select(`
      id, code, created_at, used_at,
      creator:created_by(username),
      redeemer:used_by(username)
    `)
    .order("created_at", { ascending: false })
    .limit(200)

  const unused = codes?.filter(c => !c.redeemer).length ?? 0
  const used = codes?.filter(c => c.redeemer).length ?? 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-white mb-1">Invite Codes</h2>
          <p className="text-gray-500 text-sm">{unused} unused · {used} used</p>
        </div>
        <div className="flex gap-2">
          <form action={generateCodes.bind(null, 10)}>
            <button className="bg-[#e378ac]/10 hover:bg-[#e378ac]/20 text-[#e378ac] border border-[#e378ac]/20 text-sm font-bold px-4 py-2 rounded-xl transition">
              + Generate 10
            </button>
          </form>
          <form action={generateCodes.bind(null, 50)}>
            <button className="bg-[#e378ac] hover:bg-[#c0547a] text-white text-sm font-bold px-4 py-2 rounded-xl transition">
              + Generate 50
            </button>
          </form>
        </div>
      </div>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide">
              <th className="text-left px-6 py-4">Code</th>
              <th className="text-left px-6 py-4">Created by</th>
              <th className="text-left px-6 py-4">Used by</th>
              <th className="text-left px-6 py-4">Used at</th>
              <th className="text-left px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {codes?.map((c, i) => (
              <tr key={c.id} className={`border-b border-[#1f1f1f] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                <td className="px-6 py-4 font-mono font-bold text-white tracking-widest">{c.code}</td>
                <td className="px-6 py-4 text-gray-400">
                  {(c.creator as any)?.username ? `@${(c.creator as any).username}` : <span className="text-gray-600">admin</span>}
                </td>
                <td className="px-6 py-4 text-gray-400">
                  {(c.redeemer as any)?.username ? `@${(c.redeemer as any).username}` : "—"}
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {c.used_at ? new Date(c.used_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    (c.redeemer as any)?.username
                      ? "bg-gray-500/10 text-gray-500"
                      : "bg-green-400/10 text-green-400"
                  }`}>
                    {(c.redeemer as any)?.username ? "Used" : "Available"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
