import { supabase } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

const PAGE = (message: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="text-align:center;max-width:420px;padding:40px 24px;">
    <p style="margin:0 0 24px;font-size:32px;font-style:italic;font-weight:900;color:#e378ac;font-family:Georgia,serif;">haven</p>
    <p style="margin:0;font-size:16px;color:#ccc;line-height:1.7;">${message}</p>
  </div>
</body>
</html>
`

// Unsubscribe link in reengagement emails — sets email_opt_out for that user.
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user")
  if (!userId) {
    return new NextResponse(PAGE("Missing link parameters."), { status: 400, headers: { "Content-Type": "text/html" } })
  }

  const { error } = await supabase.from("profiles").update({ email_opt_out: true }).eq("id", userId)
  if (error) {
    return new NextResponse(PAGE("Something went wrong — please try again later."), { status: 500, headers: { "Content-Type": "text/html" } })
  }

  return new NextResponse(PAGE("You've been unsubscribed from reminder emails. You'll still get important account emails."), { headers: { "Content-Type": "text/html" } })
}
