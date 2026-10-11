"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateAmbassador } from "@/app/(admin)/ambassadors/actions"

export default function EditAmbassadorForm({
  id,
  campus,
  payoutMethod,
  payoutHandle,
  rateCents,
  monthlyCapCents,
}: {
  id: string
  campus: string | null
  payoutMethod: string | null
  payoutHandle: string | null
  rateCents: number
  monthlyCapCents: number
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setSubmitting(true)
    setError(null)
    setSaved(false)
    const { error } = await updateAmbassador(id, formData)
    setSubmitting(false)
    if (error) { setError(error); return }
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-2.5">
      <input name="campus" defaultValue={campus ?? ""} placeholder="Campus" disabled={submitting}
        className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-[#e378ac] disabled:opacity-50" />
      <select name="payout_method" defaultValue={payoutMethod ?? ""} disabled={submitting}
        className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#e378ac] disabled:opacity-50">
        <option value="">Payout method</option>
        <option value="cash_app">Cash App</option>
        <option value="zelle">Zelle</option>
      </select>
      <input name="payout_handle" defaultValue={payoutHandle ?? ""} placeholder="$cashtag or Zelle handle" disabled={submitting}
        className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-[#e378ac] disabled:opacity-50" />
      <div className="grid grid-cols-2 gap-2">
        <input name="rate_dollars" type="number" step="0.01" defaultValue={(rateCents / 100).toFixed(2)} disabled={submitting}
          className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#e378ac] disabled:opacity-50" />
        <input name="cap_dollars" type="number" step="1" defaultValue={(monthlyCapCents / 100).toFixed(0)} disabled={submitting}
          className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#e378ac] disabled:opacity-50" />
      </div>
      <p className="text-gray-600 text-[10px]">Rate ($/QAU) and monthly cap ($)</p>
      <button type="submit" disabled={submitting} className="bg-white/5 hover:bg-white/10 disabled:opacity-50 text-gray-300 text-xs font-bold px-4 py-2 rounded-lg transition">
        {submitting ? "Saving…" : saved ? "Saved ✓" : "Save"}
      </button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </form>
  )
}
