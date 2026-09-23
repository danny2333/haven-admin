import { supabase } from "@/lib/supabase"
import { getAdminTZ, localDayStart } from "@/lib/date"
import AdminSidebar from "@/components/AdminSidebar"
import NotificationBell from "@/components/NotificationBell"
import PushRegistrar from "@/components/PushRegistrar"

export const revalidate = 0

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const tz = await getAdminTZ()
  const todayStart = localDayStart(tz)

  const [
    { count: waitlistPending },
    { count: requestsPending },
    { count: reportsPending },
    { data: waitlistItems },
    { data: requestItems },
    { data: reportItems },
    { data: newUserItems },
  ] = await Promise.all([
    supabase.from("waitlist").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("code_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),

    // Detailed items for the bell dropdown
    supabase.from("waitlist")
      .select("id, name, email, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10),

    supabase.from("code_requests")
      .select("id, requested_at, user_id")
      .eq("status", "pending")
      .order("requested_at", { ascending: false })
      .limit(10),

    supabase.from("reports")
      .select("id, reason, created_at, reported_user_id")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10),

    supabase.from("profiles")
      .select("id, username, created_at")
      .gte("created_at", todayStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(10),
  ])

  // code_requests.user_id and reports.reported_user_id are FKs to auth.users,
  // not profiles, so PostgREST can't embed profiles(...) directly on them —
  // look the usernames up separately instead.
  const lookupIds = [
    ...new Set([
      ...(requestItems ?? []).map(r => r.user_id),
      ...(reportItems ?? []).map(r => r.reported_user_id),
    ].filter(Boolean)),
  ]
  const { data: lookupProfiles } = lookupIds.length > 0
    ? await supabase.from("profiles").select("id, username").in("id", lookupIds)
    : { data: [] as { id: string; username: string }[] }
  const usernameById = new Map((lookupProfiles ?? []).map(p => [p.id, p.username]))

  const requestItemsWithProfile = (requestItems ?? []).map(r => ({
    ...r,
    profile: r.user_id ? { username: usernameById.get(r.user_id) ?? null } : null,
  }))
  const reportItemsWithProfile = (reportItems ?? []).map(r => ({
    ...r,
    reported_user: r.reported_user_id ? { username: usernameById.get(r.reported_user_id) ?? null } : null,
  }))

  return (
    <div className="flex min-h-screen bg-[#0f0f0f]">
      <AdminSidebar
        counts={{
          waitlist: waitlistPending ?? 0,
          requests: requestsPending ?? 0,
          reports:  reportsPending  ?? 0,
        }}
      />

      <div className="ml-56 flex-1 flex flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-8 py-3 bg-[#0f0f0f] border-b border-[#1f1f1f]">
          <div />
          <NotificationBell
            waitlist={waitlistItems  ?? []}
            requests={requestItemsWithProfile}
            reports={reportItemsWithProfile}
            newUsers={newUserItems  ?? []}
          />
        </div>

        <PushRegistrar />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
