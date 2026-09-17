"use client"
import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

type Code = {
  id: string
  code: string
  created_at: string
  used_at: string | null
  expires_at: string | null
  creator: { id: string; username: string } | null
  redeemer: { id: string; username: string } | null
}

export default function CodesTable({
  codes,
  onDelete,
}: {
  codes: Code[]
  onDelete: (id: string) => Promise<void>
}) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [isPending, startTransition] = useTransition()

  const filtered = q.trim()
    ? codes.filter(c => {
        const search = q.toLowerCase().trim()
        return (
          c.creator?.username?.toLowerCase().includes(search) ||
          c.redeemer?.username?.toLowerCase().includes(search) ||
          c.code.toLowerCase().includes(search)
        )
      })
    : codes

  const used   = filtered.filter(c => c.redeemer)
  const unused = filtered.filter(c => !c.redeemer)

  const allSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id))
  const someSelected = selected.size > 0

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(c => c.id)))
    }
  }

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleDelete = (c: Code) => {
    const msg = c.redeemer
      ? `Delete code ${c.code}? It was used by @${c.redeemer.username}. This cannot be undone.`
      : `Delete unused code ${c.code}? This cannot be undone.`
    if (!confirm(msg)) return
    setDeletingId(c.id)
    startTransition(async () => {
      await onDelete(c.id)
      setDeletingId(null)
    })
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selected)
    if (!confirm(`Delete ${ids.length} selected code${ids.length !== 1 ? "s" : ""}? This cannot be undone.`)) return
    setBulkDeleting(true)
    await fetch("/api/delete-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
    setSelected(new Set())
    setBulkDeleting(false)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by username or code…"
          className="flex-1 max-w-md bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#e378ac]"
        />
        {someSelected && (
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-bold px-4 py-2.5 rounded-xl transition disabled:opacity-50"
          >
            {bulkDeleting ? "Deleting…" : `Delete ${selected.size} selected`}
          </button>
        )}
      </div>

      {q.trim() && (
        <p className="text-gray-600 text-xs mb-3">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} · {used.length} used · {unused.length} unused
        </p>
      )}

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-4">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded accent-[#e378ac] cursor-pointer"
                />
              </th>
              <th className="text-left px-4 py-4">Code</th>
              <th className="text-left px-4 py-4">Created by</th>
              <th className="text-left px-4 py-4">Used by</th>
              <th className="text-left px-4 py-4">Used at</th>
              <th className="text-left px-4 py-4">Expires</th>
              <th className="text-left px-4 py-4">Status</th>
              <th className="px-4 py-4" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-600">
                  No codes match your search
                </td>
              </tr>
            )}
            {filtered.map((c, i) => {
              const nowMs = Date.now()
              const expiresMs = c.expires_at ? new Date(c.expires_at).getTime() : null
              const isExpired = !c.redeemer && expiresMs !== null && expiresMs <= nowMs
              const daysLeft = !c.redeemer && !isExpired && expiresMs !== null
                ? Math.ceil((expiresMs - nowMs) / (1000 * 60 * 60 * 24))
                : null
              const expiringSoon = daysLeft !== null && daysLeft <= 7
              const isSelected = selected.has(c.id)
              return (
                <tr
                  key={c.id}
                  className={`border-b border-[#1f1f1f] group transition ${
                    isSelected ? "bg-[#e378ac]/5" : isExpired ? "bg-orange-500/[0.04]" : i % 2 === 0 ? "" : "bg-white/[0.02]"
                  }`}
                >
                  <td className="px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(c.id)}
                      className="w-4 h-4 rounded accent-[#e378ac] cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-4 font-mono font-bold text-white tracking-widest">{c.code}</td>
                  <td className="px-4 py-4">
                    {c.creator ? (
                      <Link href={`/users/${c.creator.id}`} className="text-[#e378ac] hover:underline font-semibold">
                        @{c.creator.username}
                      </Link>
                    ) : (
                      <span className="text-gray-600">admin</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {c.redeemer ? (
                      <Link href={`/users/${c.redeemer.id}`} className="text-gray-300 hover:text-[#e378ac] hover:underline font-semibold transition">
                        @{c.redeemer.username}
                      </Link>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-gray-500">
                    {c.used_at ? new Date(c.used_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-4 text-xs">
                    {c.expires_at ? (
                      <span className={
                        isExpired ? "text-orange-400 font-semibold"
                        : expiringSoon ? "text-yellow-400 font-semibold"
                        : "text-gray-400"
                      }>
                        {new Date(c.expires_at).toLocaleDateString()}
                        {isExpired && <span className="ml-1.5 bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-bold text-[10px]">EXPIRED</span>}
                        {daysLeft !== null && (
                          <span className={`ml-1.5 ${expiringSoon ? "text-yellow-400" : "text-gray-600"}`}>
                            · {daysLeft}d left
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-600 italic">No expiry</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      c.redeemer
                        ? "bg-gray-500/10 text-gray-500"
                        : isExpired
                          ? "bg-orange-500/20 text-orange-400"
                          : expiringSoon
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-green-400/10 text-green-400"
                    }`}>
                      {c.redeemer ? "Used" : isExpired ? "⚠ Expired" : expiringSoon ? `${daysLeft}d left` : "Available"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => handleDelete(c)}
                      disabled={deletingId === c.id || isPending}
                      className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-300 font-semibold transition disabled:opacity-30"
                    >
                      {deletingId === c.id ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
