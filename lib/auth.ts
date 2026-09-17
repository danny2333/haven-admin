import { NextRequest } from "next/server"

export function isAdminAuthed(req: NextRequest): boolean {
  const session = req.cookies.get("haven_admin")?.value
  const validToken = process.env.ADMIN_SESSION_TOKEN
  return !!validToken && session === validToken
}

export function isWebhookAuthed(req: NextRequest): boolean {
  const secret = req.headers.get("x-webhook-secret")
  const validSecret = process.env.WEBHOOK_SECRET
  return !!validSecret && secret === validSecret
}
