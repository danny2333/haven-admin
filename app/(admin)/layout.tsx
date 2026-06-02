"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

const NAV = [
  { href: "/",          label: "Dashboard",     icon: "◈" },
  { href: "/users",     label: "Users",          icon: "👥" },
  { href: "/waitlist",  label: "Waitlist",       icon: "🕊️" },
  { href: "/codes",     label: "Invite Codes",   icon: "🎟️" },
  { href: "/requests",  label: "Code Requests",  icon: "📬" },
  { href: "/posts",       label: "Posts",          icon: "🌸" },
  { href: "/daily",       label: "Daily",          icon: "☀️" },
  { href: "/communities", label: "Communities",   icon: "🏘️" },
  { href: "/reports",       label: "Reports",        icon: "🚨" },
  { href: "/streaks",       label: "Streaks",        icon: "🔥" },
  { href: "/announcements", label: "Announcements", icon: "📣" },
  { href: "/settings",      label: "Settings",      icon: "⚙️" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen bg-[#0f0f0f]">
      {/* Sidebar */}
      <aside className="w-56 bg-[#141414] border-r border-[#1f1f1f] flex flex-col fixed h-full">
        <div className="px-6 py-6 border-b border-[#1f1f1f]">
          <h1 className="text-2xl font-black text-[#e378ac] italic">haven</h1>
          <p className="text-xs text-gray-500 mt-0.5">admin</p>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  active
                    ? "bg-[#e378ac]/10 text-[#e378ac]"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-[#1f1f1f]">
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-red-400 hover:bg-red-400/5 transition"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-56 flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
