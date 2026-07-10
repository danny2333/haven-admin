"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import nodemailer from "nodemailer"

function makeTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

export async function resolveReport(
  reportId: string,
  level: number,
  postId: string | null,
  messageId: string | null,
  reportedUserId: string,
  suspendUntil: string | null,
  note: string | null,
): Promise<{ error: string | null }> {
  try {
    // Fetch post content BEFORE deleting so we can include it in the warning email
    let postSnippet: string | null = null
    if (postId) {
      const { data: post } = await supabase
        .from("posts")
        .select("content, headline")
        .eq("id", postId)
        .single()
      postSnippet = post?.headline || (post?.content ? post.content.slice(0, 200) : null)
    }

    // Fetch reported user's email + username for all levels
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("email, username")
      .eq("id", reportedUserId)
      .single()

    // L1+ — remove the reported content
    if (level >= 1) {
      if (postId)    await supabase.from("posts").delete().eq("id", postId)
      if (messageId) await supabase.from("messages").delete().eq("id", messageId)
    }

    // L2 — warn: send email + in-app notification
    if (level === 2) {
      const warningTime = new Date().toLocaleString("en-US", {
        month: "long", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit", timeZoneName: "short",
      })

      if (userProfile?.email) {
        const postBlock = postSnippet
          ? `<div style="background:#111;border-left:3px solid #e378ac;border-radius:8px;padding:14px 18px;margin:20px 0;font-size:14px;color:#aaa;font-style:italic;">"${postSnippet}${postSnippet.length >= 200 ? "…" : ""}"</div>`
          : ""

        await makeTransporter().sendMail({
          from: `"Haven" <${process.env.GMAIL_USER}>`,
          to: userProfile.email,
          subject: "Warning: your Haven post was removed",
          html: `
            <div style="background:#0f0f0f;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              <div style="max-width:560px;margin:0 auto;">
                <p style="font-size:32px;font-style:italic;font-weight:900;color:#e378ac;font-family:Georgia,serif;margin:0 0 32px;">haven</p>
                <div style="background:#1a1a1a;border-radius:20px;padding:32px;border:1px solid #2a2a2a;">
                  <p style="font-size:16px;font-weight:700;color:#fff;margin:0 0 16px;">Hi @${userProfile.username ?? "there"},</p>
                  <p style="font-size:15px;color:#ccc;line-height:1.7;margin:0 0 12px;">
                    We've removed one of your posts and issued a <strong style="color:#f59e0b;">formal warning</strong> on your account.
                  </p>
                  ${postBlock}
                  <p style="font-size:14px;color:#888;margin:0 0 8px;"><strong style="color:#ccc;">Removed at:</strong> ${warningTime}</p>
                  ${note ? `<p style="font-size:14px;color:#888;margin:0 0 16px;"><strong style="color:#ccc;">Reason:</strong> ${note}</p>` : ""}
                  <p style="font-size:14px;color:#aaa;line-height:1.7;margin:16px 0 0;">
                    Haven is a safe space for women. Content that violates our community guidelines is removed to protect all members.
                    Repeated violations may result in a suspension or permanent ban.
                  </p>
                  <p style="margin:28px 0 0;font-size:14px;color:#666;">
                    — The Haven Team<br/>
                    <a href="mailto:havenapp2026@gmail.com" style="color:#e378ac;">havenapp2026@gmail.com</a>
                  </p>
                </div>
              </div>
            </div>
          `,
        }).catch((e: any) => console.error("Warning email failed:", e))
      }

      // In-app notification
      await supabase.from("notifications").insert([{
        user_id:      reportedUserId,
        type:         "moderation_warning",
        from_user_id: null,
      }])
    }

    // L3 — suspend: only update columns we know exist
    if (level === 3 && suspendUntil) {
      const { error: suspendError } = await supabase
        .from("profiles")
        .update({ suspended_until: suspendUntil })
        .eq("id", reportedUserId)
      if (suspendError) throw new Error(`Suspend failed: ${suspendError.message}`)
    }

    // L4 — ban: only update columns we know exist
    if (level === 4) {
      const { error: banError } = await supabase
        .from("profiles")
        .update({ banned: true })
        .eq("id", reportedUserId)
      if (banError) throw new Error(`Ban failed: ${banError.message}`)
    }

    // Mark report resolved
    const ACTION: Record<number, string> = {
      1: "content_removed",
      2: "warned",
      3: "suspended",
      4: "banned",
    }
    const { error: resolveError } = await supabase
      .from("reports")
      .update({
        status:      "resolved",
        action:      ACTION[level],
        resolved_at: new Date().toISOString(),
      })
      .eq("id", reportId)
    if (resolveError) throw new Error(`Resolve failed: ${resolveError.message}`)

    revalidatePath("/reports")
    return { error: null }
  } catch (e: any) {
    console.error("resolveReport error:", e)
    return { error: e.message ?? "Something went wrong" }
  }
}

export async function escalateReport(
  reportId: string,
  priority: string,
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from("reports").update({ priority }).eq("id", reportId)
    if (error) throw new Error(error.message)
    revalidatePath("/reports")
    return { error: null }
  } catch (e: any) {
    return { error: e.message ?? "Something went wrong" }
  }
}

export async function dismissReport(
  reportId: string,
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from("reports").update({ status: "dismissed" }).eq("id", reportId)
    if (error) throw new Error(error.message)
    revalidatePath("/reports")
    return { error: null }
  } catch (e: any) {
    return { error: e.message ?? "Something went wrong" }
  }
}
