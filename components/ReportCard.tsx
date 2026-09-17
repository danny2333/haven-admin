"use client"
import { useState, useTransition } from "react"
import Image from "next/image"
import ImagePreviewButton from "@/components/ImagePreviewButton"
import SendEmailModal from "@/components/SendEmailModal"
import { resolveReport, escalateReport, dismissReport } from "@/app/(admin)/reports/actions"

// ── Priority config ──────────────────────────────────────────────────────────
const PRIORITY: Record<string, { label: string; text: string; bg: string; border: string; hours: number; urgency: string }> = {
  p0: { label: "P0", text: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30",    hours: 1,  urgency: "1 hr"   },
  p1: { label: "P1", text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", hours: 4,  urgency: "4 hrs"  },
  p2: { label: "P2", text: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", hours: 24, urgency: "24 hrs" },
  p3: { label: "P3", text: "text-gray-400",   bg: "bg-white/5",       border: "border-white/10",      hours: 72, urgency: "72 hrs" },
}

const parseImageUrls = (raw: string | null): string[] => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((u: unknown) => typeof u === "string" && (u as string).startsWith("http"))
    if ((parsed as any)?._type === "text-card") return []
  } catch {}
  return raw.startsWith("http") ? [raw] : []
}

type TextCard = { text: string; bg: string; textColor: string; fontFamily: string; fontStyle: string; fontWeight: string; fontSize: number; lineHeight: number; align: string }
const parseTextCard = (raw: string | null): TextCard | null => {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed?._type === "text-card") return parsed as TextCard
  } catch {}
  return null
}

const DEFAULT_PRIORITY: Record<string, string> = {
  "Threats or violent content":            "p1",
  "I'm worried about this person":         "p1",
  "Hate speech or discrimination":         "p1",
  "Scam or fraud":                         "p1",
  "Sharing private information (doxxing)": "p1",
  "Harassment or bullying":                "p2",
  "Unwanted sexual advances":              "p2",
  "Nudity or sexual content":              "p2",
  "Fake account or impersonation":         "p2",
  "Spam or self-promotion":                "p3",
  "Something else":                        "p3",
  "Threatening or violent content":        "p1",
  "Self-harm or suicidal content":         "p1",
  "Inappropriate content":                 "p2",
  "Spam":                                  "p3",
}

// ── Playbook guidance ────────────────────────────────────────────────────────
const PLAYBOOK: Record<string, { steps: string[]; defaultLevel: number }> = {
  "Harassment or bullying": { defaultLevel: 2, steps: [
    "Read the full thread — context decides if this is mutual conflict or one-sided targeting.",
    "Check for a pattern of prior reports. Look for coordination across multiple accounts.",
    "First isolated incident → L1 (remove) or L2 (warning).",
    "Repeated or coordinated → L3 suspension. Coordinated pile-ons are P1.",
    "Check in with the target privately and offer block assistance.",
  ]},
  "Hate speech or discrimination": { defaultLevel: 2, steps: [
    "Remove content immediately before finishing the investigation.",
    "Targeted at a specific member → P1. General → P2.",
    "First offense, non-targeted → L2 warning. Targeted or repeated → L3 or L4.",
    "Slurs or dehumanising language directed at a member are ban-tier by default.",
    "Document any 'it was a joke' response — don't let it change the outcome.",
  ]},
  "Threats or violent content": { defaultLevel: 3, steps: [
    "P1 by default. Escalate to P0 if the threat names a person, place, time, or method.",
    "P0: notify all three founders immediately. If credible and immediate, contact emergency services.",
    "Suspend the account immediately — don't leave a threat-making account active during triage.",
    "Non-specific threats → L2 or L3 depending on tone and history.",
    "If a member is the target, check in and let her know she can involve authorities.",
  ]},
  "Unwanted sexual advances": { defaultLevel: 2, steps: [
    "Review the thread for a pattern: one message vs. persistence after a clear no.",
    "Single unwanted message, no prior pattern → L2 warning.",
    "Continued contact after refusal or sexual coercion → L3 minimum. Explicit persistence → L4.",
    "Check in with the target proactively and suggest blocking.",
    "Review only the reported thread — don't browse other conversations without a separate report.",
  ]},
  "Nudity or sexual content": { defaultLevel: 2, steps: [
    "FIRST: could anyone depicted be a minor? If any doubt, treat as CSAM — stop this workflow.",
    "Clearly adult content → remove immediately. L1 or L2 for first offense.",
    "Repeated after warning → L3 suspension.",
    "Non-consensual framing (hidden camera, unaware subject) → also treat as doxxing, escalate to P1.",
    "Sexual content directed at a specific member → also handle as unwanted sexual advances.",
  ]},
  "Sharing private information (doxxing)": { defaultLevel: 4, steps: [
    "Remove content immediately — exposure time is the harm.",
    "Then investigate: who posted, is the person a member, is there an ongoing safety risk?",
    "Ban-tier by default — don't default to a warning even for a first offense.",
    "Notify the affected person: what was shared, removed, and what happened to the account.",
    "Active safety risk (stalking, abusive partner) → P0, loop in all founders.",
  ]},
  "Spam or self-promotion": { defaultLevel: 1, steps: [
    "Remove the content. First offense → L1, no warning needed.",
    "Repeat pattern → L2 warning, then L3/L4 for continued posting.",
    "Bot network signs (new accounts, similar content, rapid posting) → P1, ban the cluster.",
    "Check the invite chain — see if one compromised code is the source.",
  ]},
  "Scam or fraud": { defaultLevel: 4, steps: [
    "Remove content immediately — financial harm compounds every minute it's visible.",
    "Check engagement: has anyone replied or DM'd? If so, P1 — reach out to warn them.",
    "Ban the account — this is not a warning-tier category.",
    "Impersonating Haven staff → P1 regardless. Consider an in-app notice.",
  ]},
  "Fake account or impersonation": { defaultLevel: 3, steps: [
    "Impersonating a person/brand → verify, suspend while verifying, ban if confirmed.",
    "Bot / coordinated account → check for a cluster; ban the cluster; review the invite source.",
    "'May not meet membership requirements' → handle privately per the eligibility process only.",
    "Never discuss eligibility cases in any channel visible to members.",
  ]},
  "I'm worried about this person": { defaultLevel: 1, steps: [
    "NOT an enforcement report — nothing happens to the worried-about member's account.",
    "Assess urgency: explicit immediate self-harm intent with specifics (P0) or general distress (P1)?",
    "P0 → reach out immediately with crisis-outreach message. If explicit, contact emergency services.",
    "P1 → send warm private check-in with crisis resources (988, Crisis Text Line) within 4 hours.",
    "Do NOT remove her content unless it separately violates a rule.",
    "Thank the reporter and offer her resources too.",
  ]},
  "Something else": { defaultLevel: 2, steps: [
    "Read it fully before forcing it into a category.",
    "Is there a safety element? If yes, treat with urgency of the closest matching category.",
    "Handle using the closest analogous category's severity and enforcement ladder.",
    "Flag for founders if recurring — it may mean a category is missing.",
  ]},
}

const SUSPEND_DURATIONS = [
  { label: "24 hours", hours: 24 },
  { label: "2 days",   hours: 48 },
  { label: "1 week",   hours: 168 },
  { label: "1 month",  hours: 720 },
]

function slaStatus(createdAt: string, hours: number) {
  const deadline = new Date(new Date(createdAt).getTime() + hours * 60 * 60 * 1000)
  const now = new Date()
  const diffMs = deadline.getTime() - now.getTime()
  if (diffMs <= 0) return { label: "SLA BREACHED", color: "text-red-400", breached: true }
  const h = Math.floor(diffMs / (1000 * 60 * 60))
  const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  return {
    label: h > 0 ? `${h}h ${m}m left` : `${m}m left`,
    color: diffMs < 60 * 60 * 1000 ? "text-red-400" : diffMs < 2 * 60 * 60 * 1000 ? "text-orange-400" : "text-gray-500",
    breached: false,
  }
}

type Props = {
  report: any
  reporter?: { username: string; email: string }
  reported?: { username: string; email: string }
  postContent?: { content: string | null; image_url: string | null; is_anonymous: boolean; username: string | null } | null
  messageContent?: { content: string | null; image_url: string | null; sender_id: string } | null
  communityPostContent?: { title: string | null; content: string | null; image_url: string | null; username: string | null; community: string | null } | null
  replyContent?: { text: string | null; voice_url: string | null; username: string | null } | null
}

export default function ReportCard({
  report: r, reporter, reported,
  postContent, messageContent, communityPostContent, replyContent,
}: Props) {
  const priority = (r.priority ?? DEFAULT_PRIORITY[r.reason] ?? "p2") as keyof typeof PRIORITY
  const pc = PRIORITY[priority] ?? PRIORITY.p2
  const sla = slaStatus(r.created_at, pc.hours)
  const playbook = PLAYBOOK[r.reason]

  const [showGuide, setShowGuide] = useState(false)
  const [action, setAction] = useState<null | "l1" | "l2" | "l3" | "l4" | "escalate">(null)
  const [suspendDuration, setSuspendDuration] = useState(SUSPEND_DURATIONS[0])
  const [note, setNote] = useState("")
  const [escalateTo, setEscalateTo] = useState("p0")
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  const handleResolve = (level: number, suspendUntil: string | null = null) => {
    startTransition(async () => {
      const { error } = await resolveReport(
        r.id, level,
        r.reported_post_id ?? null,
        r.reported_message_id ?? null,
        r.reported_user_id,
        suspendUntil,
        note || null,
        r.reported_reply_id ?? null,
        r.reported_community_reply_id ?? null,
      )
      if (error) {
        alert(`Action failed: ${error}`)
      } else {
        setDone(true)
      }
    })
  }

  const handleEscalate = () => {
    startTransition(async () => {
      const { error } = await escalateReport(r.id, escalateTo)
      if (error) {
        alert(`Escalate failed: ${error}`)
      } else {
        setAction(null)
      }
    })
  }

  if (done) return null

  return (
    <div className={`bg-[#1a1a1a] border rounded-2xl p-6 ${sla.breached ? "border-red-500/40" : "border-[#2a2a2a]"}`}>
      {/* Top row: priority + SLA + type + escalate */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${pc.text} ${pc.bg} ${pc.border}`}>
          {pc.label} · {pc.urgency}
        </span>
        <span className={`text-xs font-semibold ${sla.color}`}>
          {sla.label}
        </span>
        {r.reported_post_id && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400">post</span>}
        {r.reported_message_id && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-400">DM</span>}
        {r.reported_community_post_id && <span className="text-xs px-2 py-0.5 rounded-full bg-green-400/10 text-green-400">community post</span>}
        {r.reported_reply_id && <span className="text-xs px-2 py-0.5 rounded-full bg-pink-400/10 text-pink-400">comment</span>}
        {r.reported_community_reply_id && <span className="text-xs px-2 py-0.5 rounded-full bg-teal-400/10 text-teal-400">community comment</span>}
        {!r.reported_post_id && !r.reported_message_id && !r.reported_community_post_id && !r.reported_reply_id && !r.reported_community_reply_id && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#e378ac]/10 text-[#e378ac]">user</span>
        )}
        <span className="text-xs text-gray-600 ml-auto">
          {new Date(r.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
        </span>
      </div>

      {/* ── Action confirmation panels — shown at the TOP so confirm is always visible ── */}
      {action === "l2" && (
        <div className="mb-4 bg-[#111] border border-yellow-500/20 rounded-xl p-4">
          <p className="text-yellow-400 text-xs font-bold uppercase tracking-wide mb-2">L2 — Warning note (optional)</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            placeholder="Note for the moderation log…"
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-yellow-500/40 mb-3"
          />
          <div className="flex gap-2">
            <button onClick={() => setAction(null)} className="flex-1 text-gray-500 text-xs font-bold py-2 rounded-xl bg-white/5 hover:bg-white/10 transition">Cancel</button>
            <button onClick={() => handleResolve(2)} disabled={isPending} className="flex-[2] text-black bg-yellow-400 hover:bg-yellow-300 font-black text-xs py-2 rounded-xl transition disabled:opacity-50">
              {isPending ? "Saving…" : "Confirm Warning + Remove Post"}
            </button>
          </div>
        </div>
      )}

      {action === "l3" && (
        <div className="mb-4 bg-[#111] border border-orange-500/20 rounded-xl p-4">
          <p className="text-orange-400 text-xs font-bold uppercase tracking-wide mb-3">L3 — Suspend · Choose duration</p>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {SUSPEND_DURATIONS.map(d => (
              <button
                key={d.hours}
                onClick={() => setSuspendDuration(d)}
                className={`py-2 rounded-xl text-xs font-bold border transition ${
                  suspendDuration.hours === d.hours
                    ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
                    : "bg-[#1a1a1a] border-[#333] text-gray-400 hover:border-orange-500/30"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="Note for the log…"
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-orange-500/40 mb-3"
          />
          <div className="flex gap-2">
            <button onClick={() => setAction(null)} className="flex-1 text-gray-500 text-xs font-bold py-2 rounded-xl bg-white/5 hover:bg-white/10 transition">Cancel</button>
            <button
              onClick={() => {
                const until = new Date(Date.now() + suspendDuration.hours * 60 * 60 * 1000).toISOString()
                handleResolve(3, until)
              }}
              disabled={isPending}
              className="flex-[2] text-black bg-orange-400 hover:bg-orange-300 font-black text-xs py-2 rounded-xl transition disabled:opacity-50"
            >
              {isPending ? "Suspending…" : `Suspend · ${suspendDuration.label}`}
            </button>
          </div>
        </div>
      )}

      {action === "l4" && (
        <div className="mb-4 bg-[#111] border border-red-500/20 rounded-xl p-4">
          <p className="text-red-400 text-xs font-bold uppercase tracking-wide mb-2">L4 — Permanent ban · Confirm</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="Note for the log…"
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-red-500/40 mb-3"
          />
          <div className="flex gap-2">
            <button onClick={() => setAction(null)} className="flex-1 text-gray-500 text-xs font-bold py-2 rounded-xl bg-white/5 hover:bg-white/10 transition">Cancel</button>
            <button onClick={() => handleResolve(4)} disabled={isPending} className="flex-[2] text-white bg-red-500 hover:bg-red-400 font-black text-xs py-2 rounded-xl transition disabled:opacity-50">
              {isPending ? "Banning…" : "Confirm Ban"}
            </button>
          </div>
        </div>
      )}

      {action === "escalate" && (
        <div className="mb-4 bg-[#111] border border-[#e378ac]/20 rounded-xl p-4">
          <p className="text-[#e378ac] text-xs font-bold uppercase tracking-wide mb-3">Escalate priority</p>
          <div className="flex gap-2 mb-3">
            {["p0","p1","p2","p3"].map(p => {
              const pc2 = PRIORITY[p]
              return (
                <button key={p} onClick={() => setEscalateTo(p)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                    escalateTo === p ? `${pc2.bg} ${pc2.border} ${pc2.text}` : "bg-[#1a1a1a] border-[#333] text-gray-500"
                  }`}
                >
                  {pc2.label}
                </button>
              )
            })}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAction(null)} className="flex-1 text-gray-500 text-xs font-bold py-2 rounded-xl bg-white/5 hover:bg-white/10 transition">Cancel</button>
            <button onClick={handleEscalate} disabled={isPending} className="flex-[2] text-white bg-[#e378ac] hover:bg-[#c0547a] font-black text-xs py-2 rounded-xl transition disabled:opacity-50">
              {isPending ? "Updating…" : `Set ${escalateTo.toUpperCase()}`}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-start gap-6">
        <div className="flex-1 min-w-0">
          {/* Reporter / Reported */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Reported by</p>
              <p className="text-white font-bold text-sm">@{reporter?.username ?? "unknown"}</p>
              {reporter?.email && (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-gray-600 text-xs">{reporter.email}</p>
                  <SendEmailModal
                    to={reporter.email}
                    username={reporter.username ?? "user"}
                    defaultSubject="Your Haven report"
                    defaultBody={`Hi @${reporter.username ?? "there"},\n\nThank you for reporting content on Haven. We've received your report and will review it shortly.\n\nThe Haven Team`}
                  />
                </div>
              )}
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Reported user</p>
              <p className="text-white font-bold text-sm">@{reported?.username ?? "unknown"}</p>
              {reported?.email && (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-gray-600 text-xs">{reported.email}</p>
                  <SendEmailModal
                    to={reported.email}
                    username={reported.username ?? "user"}
                    defaultSubject="Your Haven account"
                    defaultBody={`Hi @${reported.username ?? "there"},\n\nWe're reaching out regarding your Haven account.\n\n${r.reason ? `A report was submitted: ${r.reason}.` : ""}\n\nThe Haven Team`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Reason + playbook */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-1">
              <p className="text-gray-500 text-xs uppercase tracking-wide">Reason</p>
              {playbook && (
                <button
                  onClick={() => setShowGuide(v => !v)}
                  className="text-[#e378ac] text-xs font-semibold hover:underline"
                >
                  {showGuide ? "Hide guide ↑" : "View playbook ↓"}
                </button>
              )}
            </div>
            <p className="text-white font-semibold text-sm">{r.reason ?? "—"}</p>
            {r.context && <p className="text-gray-400 text-xs mt-1">{r.context}</p>}
          </div>

          {/* Playbook guidance */}
          {showGuide && playbook && (
            <div className="mb-4 bg-[#111] border border-[#e378ac]/15 rounded-xl p-4">
              <p className="text-[#e378ac] text-xs font-black uppercase tracking-wide mb-3">📋 Playbook — {r.reason}</p>
              <ol className="flex flex-col gap-2">
                {playbook.steps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-300 leading-relaxed">
                    <span className="text-[#e378ac] font-bold shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <p className="text-gray-600 text-xs mt-3">
                Suggested level: <span className="text-white font-bold">L{playbook.defaultLevel}</span>
              </p>
            </div>
          )}

          {/* Content previews */}
          {postContent && (
            <div className="mb-4 bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Reported post</p>
                {postContent.is_anonymous && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400">anonymous</span>}
                {parseTextCard(postContent.image_url) && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-400/10 text-indigo-400">text card</span>}
              </div>
              <p className="text-xs text-[#e378ac] font-bold mb-2">Real author: @{postContent.username ?? reported?.username ?? "unknown"}</p>
              {postContent.content && <p className="text-gray-300 text-sm leading-relaxed mb-3">{postContent.content}</p>}
              {(() => {
                const tc = parseTextCard(postContent.image_url)
                if (tc) {
                  return (
                    <div
                      style={{
                        backgroundColor: tc.bg,
                        color: tc.textColor,
                        fontFamily: tc.fontFamily,
                        fontStyle: tc.fontStyle as any,
                        fontWeight: tc.fontWeight as any,
                        fontSize: tc.fontSize,
                        lineHeight: `${tc.lineHeight}px`,
                        textAlign: tc.align as any,
                      }}
                      className="rounded-2xl p-6 leading-relaxed"
                    >
                      {tc.text}
                    </div>
                  )
                }
                const urls = parseImageUrls(postContent.image_url)
                return urls.length > 0 ? <ImagePreviewButton urls={urls} /> : null
              })()}
            </div>
          )}

          {communityPostContent && (
            <div className="mb-4 bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">Community post {communityPostContent.community && `· ${communityPostContent.community}`}</p>
              <p className="text-xs text-[#e378ac] font-bold mb-2">@{communityPostContent.username ?? "unknown"}</p>
              {communityPostContent.title && <p className="text-white font-bold text-sm mb-1">{communityPostContent.title}</p>}
              {communityPostContent.content && <p className="text-gray-300 text-sm leading-relaxed">{communityPostContent.content}</p>}
              {(() => { const urls = parseImageUrls(communityPostContent.image_url); return urls.length > 0 ? <ImagePreviewButton urls={urls} /> : null })()}
            </div>
          )}

          {messageContent && (
            <div className="mb-4 bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">Reported DM</p>
              {messageContent.content && <p className="text-gray-300 text-sm leading-relaxed">{messageContent.content}</p>}
              {(() => { const urls = parseImageUrls(messageContent.image_url); return urls.length > 0 ? <ImagePreviewButton urls={urls} /> : null })()}
            </div>
          )}

          {replyContent && (
            <div className="mb-4 bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">
                Reported comment {r.reported_community_reply_id ? "· community" : ""}
              </p>
              <p className="text-xs text-[#e378ac] font-bold mb-2">@{replyContent.username ?? reported?.username ?? "unknown"}</p>
              {replyContent.text && <p className="text-gray-300 text-sm leading-relaxed">{replyContent.text}</p>}
              {replyContent.voice_url && (
                <div className="mt-3">
                  <p className="text-gray-500 text-xs mb-1.5">Voice note:</p>
                  <audio controls src={replyContent.voice_url} className="w-full" style={{ height: 36 }} />
                </div>
              )}
              {!replyContent.text && !replyContent.voice_url && (
                <p className="text-gray-600 text-xs italic">Comment content not captured</p>
              )}
            </div>
          )}

          {r.screenshot_url && (
            <div className="mb-4">
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">Screenshot</p>
              <a href={r.screenshot_url} target="_blank" rel="noopener noreferrer" className="inline-block group">
                <Image src={r.screenshot_url} alt="Report screenshot" width={112} height={112} className="w-28 h-28 object-cover rounded-xl border-2 border-[#2a2a2a] group-hover:border-[#e378ac] transition" />
                <p className="text-[#e378ac] text-xs mt-1">View full size ↗</p>
              </a>
            </div>
          )}

        </div>

        {/* Action column */}
        {!action && (
          <div className="flex flex-col gap-2 min-w-[140px] shrink-0">
            <p className="text-gray-600 text-[10px] uppercase tracking-wide font-bold mb-1">Enforcement</p>
            <button
              onClick={() => handleResolve(1)}
              disabled={isPending}
              className="w-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-bold px-3 py-2.5 rounded-xl transition disabled:opacity-50"
            >
              L1 · Remove
            </button>
            <button
              onClick={() => { setNote(""); setAction("l2") }}
              className="w-full bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 text-xs font-bold px-3 py-2.5 rounded-xl transition"
            >
              L2 · Warn
            </button>
            <button
              onClick={() => { setNote(""); setAction("l3") }}
              className="w-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 text-xs font-bold px-3 py-2.5 rounded-xl transition"
            >
              L3 · Suspend
            </button>
            <button
              onClick={() => { setNote(""); setAction("l4") }}
              className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold px-3 py-2.5 rounded-xl transition"
            >
              L4 · Ban
            </button>
            <div className="border-t border-[#2a2a2a] my-1" />
            <button
              onClick={() => setAction("escalate")}
              className="w-full bg-[#e378ac]/10 hover:bg-[#e378ac]/20 text-[#e378ac] border border-[#e378ac]/20 text-xs font-bold px-3 py-2.5 rounded-xl transition"
            >
              Escalate ↑
            </button>
            <button
              onClick={() => startTransition(async () => {
                const { error } = await dismissReport(r.id)
                if (error) alert(`Dismiss failed: ${error}`)
                else setDone(true)
              })}
              disabled={isPending}
              className="w-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-gray-300 text-xs font-bold px-3 py-2.5 rounded-xl transition disabled:opacity-50"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
