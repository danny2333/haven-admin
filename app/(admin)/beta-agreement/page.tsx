import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

async function toggleNda(current: string) {
  "use server"
  const next = current === "true" ? "false" : "true"
  await supabase.from("app_settings").upsert({ key: "beta_nda_required", value: next }, { onConflict: "key" })
  revalidatePath("/beta-agreement")
}

const AGREEMENT_CLAUSES = [
  { heading: "1. Confidentiality", body: "Haven's app, features, design, user data, and all related information are strictly confidential. Users agree not to disclose, publicly discuss, or share details about unreleased features or any aspect of this product with third parties." },
  { heading: "2. No Copying or Replication", body: "Users agree not to copy, replicate, reverse engineer, or create any product, service, or concept that is substantially similar to Haven's features, user experience, design, or core ideas — in whole or in part." },
  { heading: "3. No Competing Products", body: "Users agree not to use any information, insights, data, or knowledge gained from participating in this beta to develop, build, fund, advise on, or assist in building any competing social platform or community product." },
  { heading: "4. Feedback", body: "Any feedback, suggestions, bug reports, or ideas provided during the beta may be used by Haven at sole discretion to improve the product. Users waive any claim to ownership, credit, or compensation for that feedback." },
  { heading: "5. Data & Privacy", body: "Information shared on Haven during the beta is subject to the privacy policy. Beta activity and data may be used internally to improve product functionality." },
  { heading: "6. Duration", body: "This agreement remains in full effect indefinitely — including after the beta period ends. Confidentiality and no-compete obligations survive termination of beta access." },
]

export default async function BetaAgreementAdmin() {
  const [{ data: settings }, { data: signers }] = await Promise.all([
    supabase.from("app_settings").select("value").eq("key", "beta_nda_required").maybeSingle(),
    supabase
      .from("beta_agreements")
      .select("id, signed_at, signed_name, version, profile:user_id(username, display_name, email)")
      .order("signed_at", { ascending: false }),
  ])

  const ndaRequired = settings?.value === "true"
  const totalSigned = signers?.length ?? 0

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-black text-white mb-1">Beta NDA</h2>
      <p className="text-gray-500 text-sm mb-8">
        {totalSigned} user{totalSigned !== 1 ? "s" : ""} have signed · {ndaRequired ? "Currently required" : "Currently off"}
      </p>

      {/* Toggle */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-white mb-1">Require Agreement</p>
            <p className="text-gray-500 text-sm">
              {ndaRequired
                ? "On — users must sign before accessing the app"
                : "Off — users can access the app without signing"}
            </p>
          </div>
          <form action={toggleNda.bind(null, ndaRequired ? "true" : "false")}>
            <button className={`relative w-14 h-7 rounded-full transition-colors ${ndaRequired ? "bg-[#e378ac]" : "bg-gray-700"}`}>
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${ndaRequired ? "translate-x-8" : "translate-x-1"}`} />
            </button>
          </form>
        </div>
        <div className={`mt-4 text-xs px-3 py-2 rounded-xl ${ndaRequired ? "bg-green-400/10 text-green-400" : "bg-gray-400/10 text-gray-400"}`}>
          {ndaRequired ? "✓ Agreement is REQUIRED — unsigned users are redirected" : "○ Agreement is OFF — users proceed without signing"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Signers list */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden col-span-2">
          <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
            <p className="text-gray-500 text-xs uppercase tracking-wide">Signed Agreements</p>
            <span className="text-[#e378ac] font-black text-sm">{totalSigned}</span>
          </div>

          {totalSigned === 0 ? (
            <div className="px-6 py-12 text-center text-gray-600">No agreements signed yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-6 py-3">User</th>
                  <th className="text-left px-6 py-3">Signed As</th>
                  <th className="text-left px-6 py-3">Version</th>
                  <th className="text-left px-6 py-3">Date Signed</th>
                </tr>
              </thead>
              <tbody>
                {signers?.map((s, i) => {
                  const profile = s.profile as any
                  return (
                    <tr key={s.id} className={`border-b border-[#1f1f1f] ${i % 2 !== 0 ? "bg-white/[0.02]" : ""}`}>
                      <td className="px-6 py-4">
                        <p className="font-bold text-white">@{profile?.username}</p>
                        {profile?.display_name && <p className="text-gray-500 text-xs">{profile.display_name}</p>}
                        <p className="text-gray-600 text-xs">{profile?.email}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-300 font-mono text-xs">{s.signed_name ?? "—"}</td>
                      <td className="px-6 py-4">
                        <span className="bg-[#e378ac]/10 text-[#e378ac] text-xs font-bold px-2 py-1 rounded-full">v{s.version}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs">
                        {new Date(s.signed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Agreement template */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
        <p className="text-gray-500 text-xs uppercase tracking-wide mb-4">Agreement Template (v1.0)</p>
        <div className="space-y-4">
          {AGREEMENT_CLAUSES.map((clause, i) => (
            <div key={i}>
              <p className="text-[#e378ac] font-bold text-sm mb-1">{clause.heading}</p>
              <p className="text-gray-400 text-sm leading-relaxed">{clause.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
