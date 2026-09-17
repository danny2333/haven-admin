"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function RequestActions({
  requestId,
  userId,
  email,
  username,
  requestedCount,
}: {
  requestId: string
  userId: string
  email: string
  username: string
  requestedCount?: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null)
  const [showReject, setShowReject] = useState(false)
  const [showApprove, setShowApprove] = useState(false)
  const [codesCount, setCodesCount] = useState(String(requestedCount ?? 5))
  const [reason, setReason] = useState("")
  const [done, setDone] = useState<"approved" | "rejected" | null>(null)

  const handleApprove = async () => {
    if (loading) return
    setLoading("approve")
    setShowApprove(false)
    await fetch("/api/approve-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, userId, email, username, codesCount: parseInt(codesCount) || 5 }),
    })
    setLoading(null)
    setDone("approved")
    router.refresh()
  }

  const handleReject = async () => {
    if (!reason.trim()) return
    setLoading("reject")
    await fetch("/api/reject-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, userId, email, username, reason: reason.trim() }),
    })
    setLoading(null)
    setDone("rejected")
    setShowReject(false)
    router.refresh()
  }

  if (done === "approved") {
    return <span className="text-xs px-2 py-1 rounded-full font-semibold bg-green-400/10 text-green-400">approved ✓</span>
  }
  if (done === "rejected") {
    return <span className="text-xs px-2 py-1 rounded-full font-semibold bg-red-400/10 text-red-400">rejected ✓</span>
  }

  return (
    <>
      <button
        onClick={() => setShowApprove(true)}
        disabled={loading !== null}
        className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 text-sm font-bold px-4 py-2 rounded-xl transition disabled:opacity-50"
      >
        Approve
      </button>

      {showApprove && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6" onClick={() => setShowApprove(false)}>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-black text-lg mb-2">Approve Request</h3>
            {requestedCount && (
              <p className="text-gray-500 text-sm mb-4">
                <span className="text-white font-semibold">@{username}</span> requested <span className="text-[#e378ac] font-bold">{requestedCount} codes</span>.
              </p>
            )}
            <label className="text-gray-400 text-xs font-bold uppercase tracking-wide block mb-2">Codes to give</label>
            <input
              type="number"
              min={1}
              max={100}
              value={codesCount}
              onChange={e => setCodesCount(e.target.value)}
              className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-400 mb-4"
            />
            <div className="flex gap-2 mb-4">
              {[5, 10, 15, 20].map(n => (
                <button
                  key={n}
                  onClick={() => setCodesCount(String(n))}
                  className={`flex-1 text-sm font-bold py-2 rounded-xl border transition ${codesCount === String(n) ? "bg-green-500/20 border-green-400 text-green-400" : "bg-white/5 border-[#333] text-gray-400 hover:border-gray-500"}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowApprove(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 font-bold py-2.5 rounded-xl transition text-sm">Cancel</button>
              <button
                onClick={handleApprove}
                disabled={loading !== null || !codesCount}
                className="flex-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 font-bold py-2.5 px-6 rounded-xl transition text-sm disabled:opacity-50"
              >
                {loading === "approve" ? "Approving…" : `Approve (${codesCount} codes)`}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setShowReject(true)}
        disabled={loading !== null}
        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-bold px-3 py-2 rounded-xl transition disabled:opacity-50"
      >
        Reject
      </button>

      {showReject && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6"
          onClick={() => setShowReject(false)}
        >
          <div
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-black text-lg">Reject Request</h3>
              <button onClick={() => setShowReject(false)} className="text-gray-600 hover:text-white text-xl">✕</button>
            </div>
            <p className="text-gray-500 text-sm mb-4">
              Tell <span className="text-white font-semibold">@{username}</span> why their request was rejected. This will be sent to them by email.
            </p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. You haven't been active enough yet, or your existing codes haven't been used. Apply again once you've grown your presence in the community."
              rows={5}
              className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-400 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowReject(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 font-bold py-2.5 rounded-xl transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!reason.trim() || loading !== null}
                className="flex-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-2.5 px-6 rounded-xl transition text-sm disabled:opacity-50"
              >
                {loading === "reject" ? "Rejecting…" : "Reject & Notify"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
