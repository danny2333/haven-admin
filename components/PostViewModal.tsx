"use client"
import { useState } from "react"
import { getPostReplies, type PostReply } from "@/app/(admin)/posts/actions"
import VoiceNotePlayer from "./VoiceNotePlayer"

type TextCard = {
  text: string; bg: string; textColor: string
  fontFamily: string; fontStyle: string; fontWeight: string
  fontSize: number; lineHeight: number; align: string
}

function parseTextCard(raw: string | null): TextCard | null {
  if (!raw) return null
  try {
    const p = JSON.parse(raw)
    if (p?._type === "text-card") return p as TextCard
  } catch {}
  return null
}

function parseImageUrls(raw: string | null): string[] {
  if (!raw) return []
  try {
    const p = JSON.parse(raw)
    if (Array.isArray(p)) return p.filter((u: unknown) => typeof u === "string" && (u as string).startsWith("http"))
    if ((p as any)?._type === "text-card") return []
  } catch {}
  return raw.startsWith("http") ? [raw] : []
}

type Props = {
  postId: string
  username: string | null
  isAnonymous: boolean
  headline?: string | null
  content: string | null
  imageUrl: string | null
  createdAt: string
  category?: string | null
}

export default function PostViewModal({ postId, username, isAnonymous, headline, content, imageUrl, createdAt, category }: Props) {
  const [open, setOpen] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)
  const [replies, setReplies] = useState<PostReply[] | null>(null)
  const [repliesLoading, setRepliesLoading] = useState(false)
  const [repliesError, setRepliesError] = useState<string | null>(null)

  const tc = parseTextCard(imageUrl)
  const imgs = parseImageUrls(imageUrl)

  const openModal = async () => {
    setOpen(true)
    setImgIdx(0)
    if (replies !== null) return
    setRepliesLoading(true)
    const { data, error } = await getPostReplies(postId)
    setReplies(data)
    setRepliesError(error)
    setRepliesLoading(false)
  }

  return (
    <>
      <button
        onClick={openModal}
        className="text-[#e378ac] text-xs font-bold hover:underline transition"
      >
        View
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
              <div className="flex items-center gap-2 flex-wrap">
                {isAnonymous && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400 font-semibold">anonymous</span>
                )}
                {tc && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-400/10 text-indigo-400 font-semibold">text card</span>
                )}
                {category && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#e378ac]/10 text-[#e378ac] font-semibold">{category}</span>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition text-lg leading-none">✕</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Author row */}
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Author</p>
                {isAnonymous ? (
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400 italic text-sm">Posted anonymously</span>
                    <span className="text-gray-500 text-xs">· real account: <span className="text-white font-semibold">@{username ?? "unknown"}</span></span>
                  </div>
                ) : (
                  <span className="text-[#e378ac] font-bold text-sm">@{username ?? "unknown"}</span>
                )}
                <p className="text-gray-600 text-xs mt-0.5">
                  {new Date(createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
              </div>

              {/* Headline */}
              {headline && (
                <div>
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Headline</p>
                  <p className="text-white font-bold text-lg leading-snug">{headline}</p>
                </div>
              )}

              {/* Text card visual */}
              {tc && (
                <div>
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-2">Card</p>
                  <div
                    style={{
                      backgroundColor: tc.bg,
                      color: tc.textColor,
                      fontFamily: tc.fontFamily === "sans-serif" ? undefined : (tc.fontFamily || undefined),
                      fontStyle: tc.fontStyle as any,
                      fontWeight: tc.fontWeight as any,
                      fontSize: tc.fontSize,
                      lineHeight: `${tc.lineHeight}px`,
                      textAlign: tc.align as any,
                    } as React.CSSProperties}
                    className="rounded-2xl p-8 leading-relaxed"
                  >
                    {tc.text}
                  </div>
                </div>
              )}

              {/* Caption / post text */}
              {content && (
                <div>
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">{tc ? "Caption" : "Content"}</p>
                  <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
                </div>
              )}

              {/* Images */}
              {imgs.length > 0 && (
                <div>
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-2">
                    {imgs.length > 1 ? `Photos (${imgIdx + 1} / ${imgs.length})` : "Photo"}
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgs[imgIdx]}
                    alt="Post image"
                    loading="lazy"
                    className="w-full rounded-2xl object-contain max-h-96 border border-[#2a2a2a]"
                  />
                  {imgs.length > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-3">
                      <button onClick={() => setImgIdx(i => Math.max(0, i - 1))} disabled={imgIdx === 0}
                        className="text-gray-400 hover:text-white disabled:opacity-30 px-2 text-lg">←</button>
                      {imgs.map((_, i) => (
                        <button key={i} onClick={() => setImgIdx(i)}
                          className={`w-2 h-2 rounded-full transition ${i === imgIdx ? "bg-[#e378ac]" : "bg-white/20"}`} />
                      ))}
                      <button onClick={() => setImgIdx(i => Math.min(imgs.length - 1, i + 1))} disabled={imgIdx === imgs.length - 1}
                        className="text-gray-400 hover:text-white disabled:opacity-30 px-2 text-lg">→</button>
                    </div>
                  )}
                </div>
              )}

              {/* Nothing to show */}
              {!tc && !headline && !content && imgs.length === 0 && (
                <p className="text-gray-600 italic text-sm">No content to display.</p>
              )}

              {/* Replies — real author always shown, regardless of is_anonymous.
                  Anonymity on replies only ever existed in the main app's UI
                  (a letter label like "A"/"B"); the row itself always stores
                  the real user_id, so there's nothing to de-anonymize here. */}
              <div className="pt-2 border-t border-[#1f1f1f]">
                <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-2">
                  Replies{replies ? ` (${replies.length})` : ""}
                  {isAnonymous && <span className="normal-case text-purple-400/70 font-normal"> — real identities</span>}
                </p>
                {repliesLoading && <p className="text-gray-600 text-sm italic">Loading replies…</p>}
                {repliesError && <p className="text-red-400 text-sm">Couldn't load replies: {repliesError}</p>}
                {!repliesLoading && !repliesError && replies?.length === 0 && (
                  <p className="text-gray-600 text-sm italic">No replies yet.</p>
                )}
                {!repliesLoading && replies && replies.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {replies.map(r => (
                      <div key={r.id} className="flex gap-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {r.avatar_url ? (
                          <img src={r.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-[#2a2a2a] shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[#e378ac] font-bold text-xs">@{r.username ?? "unknown"}</span>
                            {r.display_name && <span className="text-gray-500 text-xs">{r.display_name}</span>}
                            {r.email && <span className="text-gray-600 text-[10px]">· {r.email}</span>}
                          </div>
                          {r.content && (
                            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap mt-0.5">{r.content}</p>
                          )}
                          {r.voice_url && (
                            <div className="mt-1.5"><VoiceNotePlayer url={r.voice_url} /></div>
                          )}
                          <p className="text-gray-700 text-[10px] mt-0.5">
                            {new Date(r.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
