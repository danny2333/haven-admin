"use server"

import { supabase } from "@/lib/supabase"

export type PostReply = {
  id: string
  content: string | null
  voice_url: string | null
  created_at: string
  user_id: string
  parent_reply_id: string | null
  username: string | null
  display_name: string | null
  avatar_url: string | null
  email: string | null
}

// replies.user_id is always the real author in the database — the main app
// only hides it client-side for Safe Space posts (behind a letter like "A"),
// never at the row level. Service role bypasses RLS entirely, so this is
// just a plain join: no de-anonymization RPC needed or available.
export async function getPostReplies(postId: string): Promise<{ data: PostReply[]; error: string | null }> {
  const { data, error } = await supabase
    .from("replies")
    .select("id, content, voice_url, created_at, user_id, parent_reply_id, profiles(username, display_name, avatar_url, email)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })

  if (error) return { data: [], error: error.message }

  const replies = (data ?? []).map((r: any) => ({
    id: r.id,
    content: r.content,
    voice_url: r.voice_url,
    created_at: r.created_at,
    user_id: r.user_id,
    parent_reply_id: r.parent_reply_id,
    username: r.profiles?.username ?? null,
    display_name: r.profiles?.display_name ?? null,
    avatar_url: r.profiles?.avatar_url ?? null,
    email: r.profiles?.email ?? null,
  }))

  return { data: replies, error: null }
}
