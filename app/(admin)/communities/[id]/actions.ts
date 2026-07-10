"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

export async function deleteCommunityPost(postId: string, communityId: string): Promise<{ error: string | null }> {
  try {
    await supabase.from("community_post_votes").delete().eq("post_id", postId)
    await supabase.from("community_replies").delete().eq("post_id", postId)
    const { error } = await supabase.from("community_posts").delete().eq("id", postId)
    if (error) throw new Error(error.message)
    revalidatePath(`/communities/${communityId}`)
    return { error: null }
  } catch (e: any) {
    return { error: e.message ?? "Something went wrong" }
  }
}

export async function removeMember(userId: string, communityId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from("community_members")
      .delete()
      .eq("community_id", communityId)
      .eq("user_id", userId)
    if (error) throw new Error(error.message)
    revalidatePath(`/communities/${communityId}`)
    return { error: null }
  } catch (e: any) {
    return { error: e.message ?? "Something went wrong" }
  }
}
