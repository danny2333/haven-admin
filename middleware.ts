import { NextRequest, NextResponse } from "next/server"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Let login page through
  if (pathname.startsWith("/login")) return NextResponse.next()

  // Check for admin session cookie
  const session = req.cookies.get("haven_admin")?.value
  if (session !== "authenticated") {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
}
