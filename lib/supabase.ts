import { createClient } from "@supabase/supabase-js"

// Service role client — bypasses RLS, server-side only.
// cache: "no-store" on every fetch so Next.js App Router never serves stale data.
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    global: {
      fetch: (url, options = {}) =>
        fetch(url, { ...options, cache: "no-store" }),
    },
  }
)
