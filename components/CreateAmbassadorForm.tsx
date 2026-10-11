"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createAmbassador } from "@/app/(admin)/ambassadors/actions"

export default function CreateAmbassadorForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (formData: FormData) => {
    setSubmitting(true)
    setError(null)
    const { error } = await createAmbassador(formData)
    setSubmitting(false)
    if (error) { setError(error); return }
    router.refresh()
    ;(document.getElementById("create-ambassador-form") as HTMLFormElement | null)?.reset()
  }

  return (
    <form id="create-ambassador-form" action={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          name="username"
          required
          placeholder="@username"
          disabled={submitting}
          className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#e378ac] transition disabled:opacity-50"
        />
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
