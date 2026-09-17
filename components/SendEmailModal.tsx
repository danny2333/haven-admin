"use client"
import { useState } from "react"

export default function SendEmailModal({
  to,
  username,
  defaultSubject,
  defaultBody,
}: {
  to: string
  username: string
  defaultSubject: string
  defaultBody: string
}) {
  const [open, setOpen]       = useState(false)
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody]       = useState(defaultBody)
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState("")

  const handleSend = async () => {
    setSending(true)
    setError("")
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body }),
      })
      if (!res.ok) throw new Error("Failed")
      setSent(true)
      setTimeout(() => { setOpen(false); setSent(false) }, 2000)
    } catch {
      setError("Failed to send. Check your email config.")
    } finally {
      setSending(false)
    }
  }

  const handleOpen = () => {
    setSubject(defaultSubject)
    setBody(defaultBody)
    setSent(false)
    setError("")
    setOpen(true)
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-[10px] px-2 py-0.5 rounded-full bg-[#e378ac]/10 text-[#e378ac] hover:bg-[#e378ac]/20 transition font-semibold whitespace-nowrap"
      >
        ✉ Email
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-black text-lg">Send Email</h3>
                <p className="text-gray-500 text-xs mt-0.5">To: {to}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-white text-xl transition">✕</button>
            </div>

            {sent ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-3">✅</p>
                <p className="text-white font-bold">Email sent to @{username}</p>
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <label className="text-gray-500 text-xs uppercase tracking-wide font-bold block mb-1.5">Subject</label>
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#e378ac]"
                  />
                </div>

                <div className="mb-4">
                  <label className="text-gray-500 text-xs uppercase tracking-wide font-bold block mb-1.5">Message</label>
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={8}
                    className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#e378ac] resize-none"
                  />
                </div>

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
                    disabled={sending || !subject || !body}
                    className="flex-2 bg-[#e378ac] hover:bg-[#c0547a] text-white font-bold py-2.5 px-6 rounded-xl transition text-sm disabled:opacity-50"
                  >
                    {sending ? "Sending…" : "Send Email"}
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
