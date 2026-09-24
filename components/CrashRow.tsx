"use client"
import { useState } from "react"

type Crash = {
  id: string
  user_id: string | null
  username: string | null
  email: string | null
  error_message: string | null
  component_stack: string | null
  platform: string | null
  app_version: string | null
  resolved: boolean
}

export default function CrashRow({
  crash,
  dateStr,
  timeStr,
  onResolve,
  onDelete,
}: {
  crash: Crash
  dateStr: string
  timeStr: string
  onResolve: () => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`bg-[#1a1a1a] border rounded-2xl overflow-hidden ${crash.resolved ? "border-[#2a2a2a] opacity-60" : "border-red-500/20"}`}>
      <div className="px-5 py-4 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {!crash.resolved && (
              <span className="bg-red-500/10 text-red-400 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                Unresolved
              </span>
            )}
            {crash.platform && (
              <span className="bg-white/5 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                {crash.platform}
              </span>
            )}
            {crash.app_version && (
              <span className="text-gray-600 text-[10px] font-bold">v{crash.app_version}</span>
            )}
            <span className="text-gray-600 text-xs">{dateStr} · {timeStr}</span>
          </div>

          <p className="text-white text-sm font-bold mb-1 break-words">
            {crash.error_message || "(no error message)"}
          </p>

          <p className="text-gray-500 text-xs">
            {crash.username
              ? <>from <span className="text-[#e378ac] font-semibold">@{crash.username}</span>{crash.email ? ` (${crash.email})` : ""}</>
              : crash.email
                ? <>from {crash.email}</>
                : "from a signed-out session"}
          </p>

          {crash.component_stack && (
            <>
              <button
                onClick={() => setExpanded(v => !v)}
                className="text-[#e378ac] text-xs font-bold mt-2 hover:underline"
              >
                {expanded ? "Hide stack" : "Show stack"}
              </button>
              {expanded && (
                <pre className="mt-2 bg-black/40 border border-[#2a2a2a] rounded-xl p-3 text-[11px] text-gray-400 overflow-x-auto whitespace-pre-wrap break-words max-h-80 overflow-y-auto">
                  {crash.component_stack}
                </pre>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 items-end shrink-0">
          <form action={onResolve}>
            <button
              type="submit"
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                crash.resolved
                  ? "bg-white/5 text-gray-400 hover:text-white"
                  : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              }`}
            >
              {crash.resolved ? "Mark unresolved" : "Mark resolved"}
            </button>
          </form>
          <form action={onDelete}>
            <button
              type="submit"
              onClick={(e) => { if (!confirm("Delete this crash report?")) e.preventDefault() }}
              className="text-gray-600 hover:text-red-400 text-xs font-bold transition"
            >
              Delete
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
