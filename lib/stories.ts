import { supabase } from "./supabase"

// Stories ("dailies" in the database) are kept forever now: expired ones are
// the owner's archive, and some sit in "Chapters" (story_highlights) on their
// profile. These helpers are shared by the Stories page and Reports.

export type StoryText = { text: string; feeling: string; emoji: string; isUpdate: boolean }

// Story text can be plain, an "update" card ({"_type":"update",...}), or (on
// older stories) prefixed with a JSON layout block ({"_l":1,...}text).
// Newer stories keep layout in its own column, so content is plain text.
export function parseStoryContent(raw: string | null): StoryText {
  if (!raw) return { text: "", feeling: "", emoji: "", isUpdate: false }
  if (raw.startsWith('{"_type":"update"')) {
    try {
      const p = JSON.parse(raw)
      if (p._type === "update") return { text: p.text || "", feeling: p.feeling || "", emoji: p.emoji || "", isUpdate: true }
    } catch {}
  }
  if (raw.startsWith('{"_l":') || raw.startsWith('{"_layout":')) {
    const sep = raw.indexOf("}") + 1
    return { text: raw.slice(sep).trim(), feeling: "", emoji: "", isUpdate: false }
  }
  return { text: raw, feeling: "", emoji: "", isUpdate: false }
}

export function storagePathInPosts(url: string | null | undefined): string | null {
  if (!url?.startsWith("http")) return null
  const m = url.match(/\/object\/(?:public|sign)\/Posts\/(.+?)(?:\?|$)/)
  return m ? m[1] : null
}

// Story ids referenced by "Daily post <id>" in a report's context (the app
// files story reports as text, not a column).
const STORY_REF = /(?:Daily post|Story)\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
export function storyIdFromReportContext(context: string | null | undefined): string | null {
  const m = context?.match(STORY_REF)
  return m ? m[1].toLowerCase() : null
}

// Deletes a story and its photo. Removing the row also removes it from any
// chapters (cascade); a chapter left empty stays hidden in the app.
export async function deleteStory(id: string): Promise<{ error: string | null }> {
  const { data: story } = await supabase.from("daily_posts").select("image_url").eq("id", id).maybeSingle()
  const path = storagePathInPosts(story?.image_url)
  if (path) await supabase.storage.from("Posts").remove([path])
  const { error } = await supabase.from("daily_posts").delete().eq("id", id)
  return { error: error?.message ?? null }
}

// Signed URLs for a batch of Posts-bucket images (one request).
export async function signPostsUrls(urls: (string | null | undefined)[]): Promise<Map<string, string>> {
  const byPath = new Map<string, string>()
  for (const u of urls) {
    const p = storagePathInPosts(u)
    if (p && u) byPath.set(p, u)
  }
  const out = new Map<string, string>()
  if (!byPath.size) return out
  const { data } = await supabase.storage.from("Posts").createSignedUrls([...byPath.keys()], 3600)
  for (const item of data ?? []) {
    const orig = item.path ? byPath.get(item.path) : null
    if (orig) out.set(orig, item.signedUrl ?? orig)
  }
  for (const [, orig] of byPath) if (!out.has(orig)) out.set(orig, orig)
  return out
}
