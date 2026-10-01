"use client"
import { useState } from "react"

export default function BroadcastDM() {
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; errors: number; total: number; pushed?: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    if (!message.trim()) return
    if (!confirm("Send this DM to every Haven user? This cannot be undone.")) return

    setSending(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch("/api/broadcast-dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult(data)
      setMessage("")
    } catch {
      setError("Something went wrong. Check the server logs.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-black text-white mb-1">Broadcast DM</h2>
      <p className="text-gray-500 text-sm mb-8">
        Send a direct message to every Haven user from @havenofficial. It lands in their DMs just like a normal message.
      </p>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 max-w-2xl">
        {/* Sender badge */}
        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-[#2a2a2a]">
          <div className="w-10 h-10 rounded-full bg-[#e378ac]/20 flex items-center justify-center shrink-0">
            <span className="text-[#e378ac] font-black text-sm">H</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm flex items-center gap-1">
              @havenofficial
              <span className="text-[#e378ac] text-xs">✓</span>
            </p>
            <p className="text-gray-600 text-xs">Messages will be sent from this account</p>
          </div>
        </div>

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Write your message to all Haven users…"
          rows={7}
          disabled={sending}
          className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#e378ac] transition resize-none mb-3 disabled:opacity-50"
        />

        <div className="flex items-center justify-between">
          <p className="text-gray-600 text-xs">{message.length} characters</p>
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="bg-[#e378ac] hover:bg-[#d4689d] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold px-6 py-3 rounded-xl transition"
          >
            {sending ? "Sending…" : "Send to all users 💌"}
          </button>
        </div>

        {sending && (
          <div className="mt-4 p-4 rounded-xl bg-[#e378ac]/10 border border-[#e378ac]/20">
            <p className="text-[#e378ac] text-sm font-semibold animate-pulse">
              Sending… this may take a moment for large user bases.
            </p>
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 rounded-xl bg-green-400/10 border border-green-400/20">
            <p className="text-green-400 font-bold text-sm">
              ✓ Delivered to {result.sent.toLocaleString()} user{result.sent !== 1 ? "s" : ""}
            </p>
            {result.errors > 0 && (
              <p className="text-yellow-400 text-xs mt-1">{result.errors} failed — check server logs</p>
            )}
            {typeof result.pushed === "number" && (
              <p className="text-gray-500 text-xs mt-1">{result.pushed.toLocaleString()} push notification{result.pushed !== 1 ? "s" : ""} sent</p>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-400/10 border border-red-400/20">
            <p className="text-red-400 text-sm font-semibold">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
