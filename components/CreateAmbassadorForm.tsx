"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createAmbassador, searchProfiles, type ProfileSuggestion } from "@/app/(admin)/ambassadors/actions"

export default function CreateAmbassadorForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState("")
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = username.trim()
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      const id = ++requestIdRef.current
      const results = await searchProfiles(q)
      if (id === requestIdRef.current) setSuggestions(results)
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [username])

  const pickSuggestion = (p: ProfileSuggestion) => {
    setUsername(p.username)
    setSuggestions([])
    setShowSuggestions(false)
  }

  const handleSubmit = async (formData: FormData) => {
    setSubmitting(true)
    setError(null)
    const { error } = await createAmbassador(formData)
    setSubmitting(false)
    if (error) { setError(error); return }
    router.refresh()
    setUsername("")
    ;(document.getElementById("create-ambassador-form") as HTMLFormElement | null)?.reset()
  }

  return (
    <form id="create-ambassador-form" action={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <input
            name="username"
            required
            autoComplete="off"
            placeholder="@username"
            disabled={submitting}
            value={username}
            onChange={e => { setUsername(e.target.value); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#e378ac] transition disabled:opacity-50"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-xl">
              {suggestions.map(p => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => pickSuggestion(p)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 transition text-left"
                >
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#2a2a2a] shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-[#e378ac] font-bold text-xs truncate">@{p.username}</p>
                    {p.display_name && <p className="text-gray-500 text-[11px] truncate">{p.display_name}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          name="campus"
          placeholder="Campus (e.g. UNT)"
          disabled={submitting}
          className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#e378ac] transition disabled:opacity-50"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <select
          name="payout_method"
          defaultValue=""
          disabled={submitting}
          className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#e378ac] transition disabled:opacity-50"
        >
          <option value="">Payout method (optional)</option>
          <option value="cash_app">Cash App</option>
          <option value="zelle">Zelle</option>
        </select>
        <input
          name="payout_handle"
          placeholder="$cashtag or Zelle handle"
          disabled={submitting}
          className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#e378ac] transition disabled:opacity-50"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="self-start bg-[#e378ac] hover:bg-[#d4689d] disabled:opacity-50 text-white text-sm font-bold px-6 py-3 rounded-xl transition"
      >
        {submitting ? "Assigning…" : "Assign ambassador badge"}
      </button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <p className="text-gray-600 text-xs">
        Their invite codes count from this moment forward — codes they created before today don't count toward QAUs.
      </p>
    </form>
  )
}
