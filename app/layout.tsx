import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Haven Admin",
  description: "Haven admin dashboard",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
