import { supabase } from "./supabase"
import { cache } from "react"

const ENV_TZ = process.env.ADMIN_TIMEZONE ?? Intl.DateTimeFormat().resolvedOptions().timeZone

// Per-request cache: reads admin_timezone from app_settings once per render tree.
export const getAdminTZ = cache(async (): Promise<string> => {
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "admin_timezone")
      .maybeSingle()
    if (data?.value) return data.value
  } catch {}
  return ENV_TZ
})

/** Synchronous fallback — uses env var. Pages that call getAdminTZ() get the live value. */
export const adminTZ = ENV_TZ

/** Format helpers — accept an optional tz override; fall back to ENV_TZ for sync callers. */

export function fmtDate(iso: string, tz = ENV_TZ): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: tz, month: "short", day: "numeric", year: "numeric",
  })
}

export function fmtDateTime(iso: string, tz = ENV_TZ): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: tz, month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  })
}

export function fmtTime(iso: string, tz = ENV_TZ): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit",
  })
}

/** Returns start-of-day in the configured timezone — use for query boundaries. */
export function localDayStart(tz = ENV_TZ): Date {
  const now = new Date()
  const dateStr = now.toLocaleDateString("sv-SE", { timeZone: tz })
  const tzStr = now.toLocaleString("en-US", { timeZone: tz, timeZoneName: "shortOffset" })
  const m = tzStr.match(/GMT([+-]\d+(?::\d+)?)/)
  if (!m) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }
  const sign = m[1][0]
  const parts = m[1].slice(1).split(":")
  const offset = `${sign}${parts[0].padStart(2, "0")}:${(parts[1] ?? "0").padStart(2, "0")}`
  return new Date(`${dateStr}T00:00:00${offset}`)
}
