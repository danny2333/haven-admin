"use client"
import { useState, useTransition } from "react"

type Props = {
  username: string
  sendAction: (message: string) => Promise<{ error?: string }>
}

export default function DMUserModal({ username, sendAction }: Props) {
  const [open, setOpen]       = useState(false)
  const [message, setMessage] = useState("")
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState("")
  const [isPending, startTransition] = useTransition()

  const handleOpen = () => {
    setMessage("")
    setDone(false)
    setError("")
    setOpen(true)
  }

  const handleSend = () => {
    if (!message.trim()) return
    setError("")
    startTransition(async () => {
      const result = await sendAction(message.trim())
      if (result?.error) {
        setError(result.error)
      } else {
        setDone(true)
        setTimeout(() => setOpen(false), 2000)
      }
    })
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="bg-[#e378ac]/10 hover:bg-[#e378ac]/20 text-[#e378ac] border border-[#e378ac]/20 font-bold px-5 py-2.5 rounded-xl text-sm transition"
      >
        💬 DM User
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-lg"
            onClick={e => e.stopPropagation()}
          >
            {done ? (
              <div className="text-center py-10">
                <p className="text-4xl mb-4">✅</p>
                <p className="text-white font-black text-lg">Message sent to @{username}</p>
                <p className="text-gray-500 text-sm mt-1">They'll see it in their DMs</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-white font-black text-lg">DM @{username}</h3>
                    <p className="text-gray-500 text-xs mt-0.5">Sent as @havenofficial · appears in their messages</p>
                  </div>
                  <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-white text-xl transition">✕</button>
                </div>

                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={6}
                  placeholder="Write your message…"
                  autoFocus
                  className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#e378ac]/50 resize-none mb-4"
                />

                {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

                <div className="flex gap-3">
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 font-bold py-2.5 rounded-xl transition text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={isPending || !message.trim()}
                    className="flex-[2] bg-[#e378ac] hover:bg-[#c0547a] text-white font-black py-2.5 rounded-xl transition text-sm disabled:opacity-50"
                  >
                    {isPending ? "Sending…" : "Send DM"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
