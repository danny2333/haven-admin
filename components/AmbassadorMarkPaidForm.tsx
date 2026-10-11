"use client"
import { useState } from "react"
import { markAmbassadorPaid } from "@/app/(admin)/ambassadors/actions"

export default function AmbassadorMarkPaidForm({
  ambassadorId,
  payoutMonth,
  monthLabel,
  qualifiedCount,
  paidCount,
  amountCents,
  capApplied,
  hasEmail,
}: {
  ambassadorId: string
  payoutMonth: string
  monthLabel: string
  qualifiedCount: number
  paidCount: number
  amountCents: number
  capApplied: boolean
  hasEmail: boolean
}) {
  const [reference, setReference] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    if (!confirm(`Mark ${monthLabel} as paid ($${(amountCents / 100).toFixed(2)}) and email the statement?`)) return
    setSubmitting(true)
    setError(null)
    const { error } = await markAmbassadorPaid(ambassadorId, payoutMonth, reference.trim())
    setSubmitting(false)
    if (error) { setError(error); return }
    setDone(true)
  }

  if (done) {
    return (
      <div className="bg-green-400/10 border border-green-400/20 rounded-xl p-4">
        <p className="text-green-400 font-bold text-sm">✓ Marked paid{hasEmail ? " — statement emailed" : ""}</p>
      </div>
    )
  }

  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-white font-bold text-sm">{qualifiedCount} qualified{capApplied ? ` · ${paidCount} paid (cap reached)` : ""}</p>
          <p className="text-gray-500 text-xs mt-0.5">{monthLabel} · not yet paid</p>
        </div>
        <p className="text-[#e378ac] font-black text-xl">${(amountCents / 100).toFixed(2)}</p>
      </div>
      <div className="flex gap-2">
        <input
          value={reference}
          onChange={e => setReference(e.target.value)}
          placeholder="Payment reference (optional)"
          disabled={submitting}
          className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-[#e378ac] transition disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-[#e378ac] hover:bg-[#d4689d] disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition whitespace-nowrap"
        >
          {submitting ? "Marking…" : hasEmail ? "Mark paid & email statement" : "Mark paid"}
        </button>
      </div>
      {!hasEmail && <p className="text-yellow-500/70 text-[11px] mt-2">No email on file — statement won't be sent.</p>}
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  )
}
