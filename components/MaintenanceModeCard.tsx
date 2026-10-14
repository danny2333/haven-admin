"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { setMaintenanceMode } from "@/app/(admin)/settings/actions"

export default function MaintenanceModeCard({
  initialEnabled,
  initialMessage,
}: {
  initialEnabled: boolean
  initialMessage: string
}) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [message, setMessage] = useState(initialMessage)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = async () => {
    const next = !enabled
    const verb = next ? "lock Haven down" : "unlock Haven"
    if (!confirm(`Are you sure you want to ${verb}? This affects every user immediately except @testuser5.`)) return
    setSubmitting(true)
    setError(null)
    const { error } = await setMaintenanceMode(next, message)
    setSubmitting(false)
    if (error) { setError(error); return }
    setEnabled(next)
    router.refresh()
  }

  const saveMessage = async () => {
    setSubmitting(true)
    setError(null)
    const { error } = await setMaintenanceMode(enabled, message)
    setSubmitting(false)
    if (error) setError(error)
  }

  return (
    <div className={`bg-[#1a1a1a] border rounded-2xl p-6 ${enabled ? "border-red-500/40" : "border-[#2a2a2a]"}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="font-bold text-white">Emergency Lockdown</p>
        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${enabled ? "bg-red-500/15 text-red-400" : "bg-green-400/10 text-green-400"}`}>
          {enabled ? "🔒 LOCKED DOWN" : "Live"}
        </span>
      </div>
      <p className="text-gray-500 text-sm mb-4">
        Blocks everyone from using the app and shows them the message below instead — except{" "}
        <span className="text-gray-300 font-semibold">@testuser5</span>, who can still get in to look around.
        Takes effect on each person's next app open.
      </p>

      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        onBlur={saveMessage}
        disabled={submitting}
        rows={3}
        placeholder="Message shown to locked-out users…"
        className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#e378ac] transition resize-none mb-4 disabled:opacity-50"
      />

      <button
        onClick={toggle}
        disabled={submitting}
        className={`w-full py-3 rounded-xl text-sm font-bold transition disabled:opacity-50 ${
          enabled
            ? "bg-green-400/10 hover:bg-green-400/20 text-green-400 border border-green-400/30"
            : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
        }`}
      >
        {submitting ? "Working…" : enabled ? "Unlock Haven" : "Lock Haven down"}
      </button>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  )
}
