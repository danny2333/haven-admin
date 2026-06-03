import { supabase } from "@/lib/supabase"
import AdminSidebar from "@/components/AdminSidebar"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [
    { count: waitlistPending },
    { count: requestsPending },
    { count: reportsPending },
  ] = await Promise.all([
    supabase.from("waitlist").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("code_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ])

  return (
    <div className="flex min-h-screen bg-[#0f0f0f]">
      <AdminSidebar
        counts={{
          waitlist: waitlistPending ?? 0,
          requests: requestsPending ?? 0,
          reports: reportsPending ?? 0,
        }}
      />
      <main className="ml-56 flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
