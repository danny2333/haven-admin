import { supabase } from "@/lib/supabase"
import AdminSidebar from "@/components/AdminSidebar"
import NotificationBell from "@/components/NotificationBell"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

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
      .select("id, requested_at, profile:user_id(username)")
      .eq("status", "pending")
      .order("requested_at", { ascending: false })
      .limit(10),

    supabase.from("reports")
      .select("id, reason, created_at, reported_user:reported_user_id(username)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10),

    supabase.from("profiles")
      .select("id, username, created_at")
      .gte("created_at", todayStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(10),
  ])

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
            requests={requestItems  ?? []}
            reports={reportItems   ?? []}
            newUsers={newUserItems  ?? []}
          />
        </div>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
