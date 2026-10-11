"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { setAmbassadorStatus } from "@/app/(admin)/ambassadors/actions"

const REMOVAL_REASONS = [
  { value: "left", label: "Left the program" },
  { value: "program_ended", label: "Program ended" },
  { value: "rules_violation", label: "Rules violation" },
  { value: "fraud", label: "Fraud" },
]

export default function AmbassadorStatusActions({
  id,
  userId,
  status,
}: {
  id: string
  userId: string
  status: "active" | "paused" | "removed"
}) {
  const router = useRouter()
  const [removing, setRemoving] = useState(false)
  const [reason, setReason] = useState("left")
  const [busy, setBusy] = useState(false)

  const act = async (next: "active" | "paused" | "removed", removalReason: string | null = null) => {
    if (next === "removed" && !confirm("Remove this ambassador? Referrals that already qualified are still paid — only future tracking stops.")) return
    setBusy(true)
    await setAmbassadorStatus(id, userId, next, removalReason)
    setBusy(false)
    setRemoving(false)
    router.refresh()
  }

  if (status === "removed") {
    return (
      <button
        onClick={() => act("active")}
        disabled={busy}
        className="text-xs font-bold text-green-400 hover:text-green-300 transition disabled:opacity-50"
      >
        Reactivate
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {status === "active" ? (
        <button onClick={() => act("paused")} disabled={busy} className="text-xs font-bold text-yellow-400 hover:text-yellow-300 transition disabled:opacity-50">
          Pause
        </button>
      ) : (
        <button onClick={() => act("active")} disabled={busy} className="text-xs font-bold text-green-400 hover:text-green-300 transition disabled:opacity-50">
          Resume
        </button>
      )}

      {!removing ? (
        <button onClick={() => setRemoving(true)} className="text-xs font-bold text-red-400/60 hover:text-red-400 transition">
          Remove
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-[#e378ac]"
          >
            {REMOVAL_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <button onClick={() => act("removed", reason)} disabled={busy} className="text-xs font-bold text-red-400 hover:text-red-300 transition disabled:opacity-50">
            Confirm
          </button>
          <button onClick={() => setRemoving(false)} className="text-xs text-gray-500 hover:text-white transition">
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
