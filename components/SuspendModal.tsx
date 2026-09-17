"use client"
import { useState, useTransition } from "react"

const DURATIONS = [
  { label: "24 hours",  value: "24h",   hours: 24 },
  { label: "2 days",    value: "2d",    hours: 48 },
  { label: "1 week",    value: "1w",    hours: 168 },
  { label: "1 month",   value: "1mo",   hours: 720 },
]

type Props = {
  userId: string
  username: string
  email: string | null
  suspendedUntil: string | null
  suspendAction: (userId: string, suspendedUntil: string, reason: string) => Promise<void>
  unsuspendAction: (userId: string) => Promise<void>
}

export default function SuspendModal({ userId, username, email, suspendedUntil, suspendAction, unsuspendAction }: Props) {
  const [open, setOpen] = useState(false)
  const [duration, setDuration] = useState(DURATIONS[0])
  const [emailBody, setEmailBody] = useState("")
  const [step, setStep] = useState<"pick" | "email">("pick")
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isSuspended = suspendedUntil && new Date(suspendedUntil) > new Date()
  const suspendedUntilDate = suspendedUntil ? new Date(suspendedUntil) : null

  const handleOpen = () => {
    setStep("pick")
    setDuration(DURATIONS[0])
    setEmailBody("")
    setDone(false)
    setOpen(true)
  }

  const handlePickDuration = (d: typeof DURATIONS[0]) => {
    setDuration(d)
    const until = new Date(Date.now() + d.hours * 60 * 60 * 1000)
    setEmailBody(
      `Hi @${username},\n\nYour Haven account has been temporarily suspended for ${d.label}.\n\n` +
      `Your account will be restored on ${until.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} at ${until.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.\n\n` +
      `Reason: [explain here]\n\n` +
      `If you believe this was a mistake, please reply to this email.\n\nThe Haven Team`
    )
    setStep("email")
  }

  const handleConfirm = () => {
    if (!emailBody.trim()) return
    const suspendedUntilISO = new Date(Date.now() + duration.hours * 60 * 60 * 1000).toISOString()

    startTransition(async () => {
      await suspendAction(userId, suspendedUntilISO, emailBody)

      if (email) {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: email,
            subject: `Your Haven account has been suspended`,
            body: emailBody,
          }),
        })
      }

      setDone(true)
      setTimeout(() => setOpen(false), 2000)
    })
  }

  const handleUnsuspend = () => {
    startTransition(async () => {
      await unsuspendAction(userId)
    })
  }

  return (
    <>
      {isSuspended ? (
        <div className="flex flex-col gap-2">
          <p className="text-yellow-400/80 text-xs">
            Suspended until {suspendedUntilDate?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
          <button
            onClick={handleUnsuspend}
            disabled={isPending}
            className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 font-bold px-5 py-2.5 rounded-xl text-sm transition disabled:opacity-50 w-full"
          >
            {isPending ? "Lifting…" : "Lift Suspension Early"}
          </button>
        </div>
      ) : (
        <button
          onClick={handleOpen}
          className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 font-bold px-5 py-2.5 rounded-xl text-sm transition"
        >
          Suspend User
        </button>
      )}

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
                <p className="text-white font-black text-lg">@{username} suspended</p>
                <p className="text-gray-500 text-sm mt-1">Email sent · Access revoked</p>
              </div>
            ) : step === "pick" ? (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-white font-black text-lg">Suspend @{username}</h3>
                    <p className="text-gray-500 text-xs mt-0.5">Choose how long to suspend this account</p>
                  </div>
                  <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-white text-xl transition">✕</button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {DURATIONS.map(d => (
                    <button
                      key={d.value}
                      onClick={() => handlePickDuration(d)}
                      className="bg-[#111] hover:bg-yellow-500/10 border border-[#333] hover:border-yellow-500/30 text-white hover:text-yellow-400 font-bold py-4 rounded-2xl text-sm transition"
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-white font-black text-lg">Suspension email</h3>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Suspending for <span className="text-yellow-400 font-bold">{duration.label}</span>
                      {email ? ` · sending to ${email}` : " · no email on file"}
                    </p>
                  </div>
                  <button onClick={() => setStep("pick")} className="text-gray-600 hover:text-white text-sm transition">← Back</button>
                </div>

                <textarea
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  rows={10}
                  className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-yellow-500/50 resize-none mb-4"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 font-bold py-2.5 rounded-xl transition text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isPending || !emailBody.trim()}
                    className="flex-[2] bg-yellow-500 hover:bg-yellow-400 text-black font-black py-2.5 rounded-xl transition text-sm disabled:opacity-50"
                  >
                    {isPending ? "Suspending…" : `Suspend · ${duration.label}`}
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
