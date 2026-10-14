"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function setMaintenanceMode(enabled: boolean, message: string): Promise<{ error: string | null }> {
  const { error: e1 } = await supabase
    .from("app_settings")
    .upsert([{ key: "maintenance_mode", value: enabled ? "true" : "false" }], { onConflict: "key" })
  if (e1) return { error: e1.message }

  const { error: e2 } = await supabase
    .from("app_settings")
    .upsert([{ key: "maintenance_message", value: message.trim() }], { onConflict: "key" })
  if (e2) return { error: e2.message }

  revalidatePath("/settings")
  return { error: null }
}
