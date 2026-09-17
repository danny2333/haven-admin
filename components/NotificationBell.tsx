"use client"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

type WaitlistItem  = { id: string; name: string; email: string; created_at: string }
type RequestItem   = { id: string; requested_at: string; profile: any }
type ReportItem    = { id: string; reason: string; created_at: string; reported_user: any }
type NewUserItem   = { id: string; username: string; created_at: string }

type Props = {
  waitlist:  WaitlistItem[]
  requests:  RequestItem[]
  reports:   ReportItem[]
  newUsers:  NewUserItem[]
}

function timeAgo(dateStr: string) {
  const d    = new Date(dateStr.endsWith("Z") ? dateStr : dateStr + "Z")
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60)    return "just now"
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

type SectionProps = {
  icon: string
  label: string
  count: number
  href: string
  children: React.ReactNode
}

function Section({ icon, label, count, href, children }: SectionProps) {
  if (count === 0) return null
  return (
    <div className="border-b border-[#2a2a2a] last:border-0">
      <Link
        href={href}
        className="flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition group"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-xs font-black uppercase tracking-wider text-gray-500 group-hover:text-gray-300 transition">
            {label}
          </span>
          <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-tight">
            {count}
          </span>
        </div>
        <span className="text-gray-600 group-hover:text-[#e378ac] text-xs transition">View all →</span>
      </Link>
      <div className="pb-2">{children}</div>
    </div>
  )
}

function Item({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="px-4 py-1.5 flex items-center justify-between gap-4">
      <span className="text-sm text-gray-300 truncate">{label}</span>
      <span className="text-xs text-gray-600 shrink-0">{sub}</span>
    </div>
  )
}

export default function NotificationBell({ waitlist, requests, reports, newUsers }: Props) {
  const [open, setOpen]     = useState(false)
  const [toast, setToast]   = useState<{ username: string } | null>(null)
  const [liveUsers, setLiveUsers] = useState<NewUserItem[]>(newUsers)
  const ref = useRef<HTMLDivElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const total = waitlist.length + requests.length + reports.length

  // Dismiss on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Poll for new users every 30s
  useEffect(() => {
    const since = new Date().toISOString()
    const poll = async () => {
      const res = await fetch(`/api/new-users?since=${encodeURIComponent(since)}`)
      const { users } = await res.json()
      if (!users?.length) return
      setLiveUsers((prev: NewUserItem[]) => {
        const existingIds = new Set(prev.map((u: NewUserItem) => u.id))
        const fresh = users.filter((u: NewUserItem) => !existingIds.has(u.id))
        if (!fresh.length) return prev
        const newest = fresh[0]
        setToast({ username: newest.username })
        if (toastTimer.current) clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast(null), 5000)
        return [...fresh, ...prev].slice(0, 10)
      })
    }
    const id = setInterval(poll, 30_000)
    return () => clearInterval(id)
  }, [])

  const allEmpty = total === 0 && liveUsers.length === 0

  return (
    <div className="relative" ref={ref}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-[100] flex items-center gap-3 bg-[#1a1a1a] border border-[#e378ac]/40 text-white px-4 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-right-4 fade-in duration-300">
          <span className="text-xl">🌸</span>
          <div>
            <p className="text-sm font-black">New member joined!</p>
            <p className="text-xs text-[#e378ac] font-semibold">@{toast.username}</p>
          </div>
          <button onClick={() => setToast(null)} className="ml-2 text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>
      )}
      <button
        onClick={() => setOpen(p => !p)}
        className="relative flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition"
      >
        <span className="text-lg">🔔</span>
        {total > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
            <span className="font-black text-white text-sm">Activity</span>
            {total > 0 && (
              <span className="text-xs text-red-400 font-bold">{total} need attention</span>
            )}
          </div>

          {allEmpty ? (
            <div className="px-4 py-8 text-center text-gray-600 text-sm">
              All clear — nothing pending 🌸
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">

              {/* Waitlist */}
              <Section icon="🕊️" label="Waitlist" count={waitlist.length} href="/waitlist">
                {waitlist.slice(0, 3).map(w => (
                  <Item key={w.id} label={w.name || w.email} sub={timeAgo(w.created_at)} />
                ))}
                {waitlist.length > 3 && (
                  <p className="px-4 text-xs text-gray-600 pb-1">+{waitlist.length - 3} more</p>
                )}
              </Section>

              {/* Code requests */}
              <Section icon="📬" label="Code Requests" count={requests.length} href="/requests">
                {requests.slice(0, 3).map(r => (
                  <Item
                    key={r.id}
                    label={`@${(r.profile as any)?.username ?? "unknown"}`}
                    sub={timeAgo(r.requested_at)}
                  />
                ))}
                {requests.length > 3 && (
                  <p className="px-4 text-xs text-gray-600 pb-1">+{requests.length - 3} more</p>
                )}
              </Section>

              {/* Reports */}
              <Section icon="🚨" label="Reports" count={reports.length} href="/reports">
                {reports.slice(0, 3).map(r => (
                  <Item
                    key={r.id}
                    label={`@${(r.reported_user as any)?.username ?? "unknown"} — ${r.reason}`}
                    sub={timeAgo(r.created_at)}
                  />
                ))}
                {reports.length > 3 && (
                  <p className="px-4 text-xs text-gray-600 pb-1">+{reports.length - 3} more</p>
                )}
              </Section>

              {/* New users today */}
              {liveUsers.length > 0 && (
                <div>
                  <Link
                    href="/users"
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition group border-b border-[#2a2a2a]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">✨</span>
                      <span className="text-xs font-black uppercase tracking-wider text-gray-500 group-hover:text-gray-300 transition">
                        New Today
                      </span>
                      <span className="bg-[#e378ac] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-tight">
                        {liveUsers.length}
                      </span>
                    </div>
                    <span className="text-gray-600 group-hover:text-[#e378ac] text-xs transition">View all →</span>
                  </Link>
                  <div className="pb-2">
                    {liveUsers.slice(0, 3).map(u => (
                      <Item key={u.id} label={`@${u.username}`} sub={timeAgo(u.created_at)} />
                    ))}
                    {liveUsers.length > 3 && (
                      <p className="px-4 text-xs text-gray-600 pb-1">+{liveUsers.length - 3} more</p>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  )
}
