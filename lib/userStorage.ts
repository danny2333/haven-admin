import { supabase } from "./supabase"

// Every bucket where the app stores a user's uploads under "<userId>/...".
// (Anonymous Safe Space voice notes live under "anon/" and can't be tied to
// a user, so they're not touched.)
const USER_BUCKETS = ["Posts", "Avatars", "journal-voices", "voice-notes"]
const PAGE = 1000

// Deletes every file in each bucket's "<userId>/" folder: story photos,
// chapter covers, post/circle/DM photos, avatar and cover, voice notes.
// Stories are kept forever now, so without this a deleted account's files
// would stay in storage indefinitely. Never throws; returns what it removed.
export async function purgeUserStorage(userId: string): Promise<{ removed: number; errors: string[] }> {
  let removed = 0
  const errors: string[] = []
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { removed, errors: ["invalid user id"] }

  for (const bucket of USER_BUCKETS) {
    try {
      // Collect first, then remove, so paging isn't thrown off by deletions.
      const paths: string[] = []
      for (let offset = 0; ; offset += PAGE) {
        const { data, error } = await supabase.storage.from(bucket).list(userId, { limit: PAGE, offset })
        if (error) { errors.push(`${bucket}: ${error.message}`); break }
        // Folder entries have no id; only files are removable.
        for (const f of data ?? []) if (f.id) paths.push(`${userId}/${f.name}`)
        if (!data || data.length < PAGE) break
      }
      for (let i = 0; i < paths.length; i += PAGE) {
        const { error } = await supabase.storage.from(bucket).remove(paths.slice(i, i + PAGE))
        if (error) errors.push(`${bucket}: ${error.message}`)
        else removed += Math.min(PAGE, paths.length - i)
      }
    } catch (e: any) {
      errors.push(`${bucket}: ${e?.message ?? "failed"}`)
    }
  }
  return { removed, errors }
}
