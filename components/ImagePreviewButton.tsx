"use client"
import { useState } from "react"
import Image from "next/image"

export default function ImagePreviewButton({ urls }: { urls: string[] }) {
  const [open, setOpen] = useState(false)
  const [idx, setIdx]   = useState(0)

  if (!urls.length) return <span className="text-gray-700 text-xs">—</span>

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 cursor-pointer"
          onClick={() => setOpen(false)}
        >
          <button className="absolute top-6 right-6 text-white/60 hover:text-white text-sm font-bold px-3 py-1 bg-white/10 rounded-xl">
            ✕ Close
          </button>

          <img
            src={urls[idx]}
            className="max-w-5xl w-full max-h-[90vh] object-contain rounded-2xl cursor-default"
            onClick={e => e.stopPropagation()}
            alt="Post image"
          />

          {urls.length > 1 && (
            <div className="flex items-center gap-3 mt-5" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setIdx(i => Math.max(0, i - 1))}
                className="text-white/50 hover:text-white text-lg px-2"
                disabled={idx === 0}
              >←</button>
              {urls.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`w-2.5 h-2.5 rounded-full transition ${i === idx ? "bg-[#e378ac]" : "bg-white/30"}`}
                />
              ))}
              <button
                onClick={() => setIdx(i => Math.min(urls.length - 1, i + 1))}
                className="text-white/50 hover:text-white text-lg px-2"
                disabled={idx === urls.length - 1}
              >→</button>
            </div>
          )}
          <p className="text-white/30 text-xs mt-3">
            {urls.length > 1 ? `${idx + 1} of ${urls.length}` : "Click anywhere to close"}
          </p>
        </div>
      )}

      <button
        onClick={() => { setOpen(true); setIdx(0) }}
        className="relative group"
        title="View image"
      >
        <Image
          src={urls[0]}
          width={96}
          height={96}
          className="w-24 h-24 rounded-xl object-cover border-2 border-[#2a2a2a] group-hover:border-[#e378ac] transition"
          alt=""
        />
        {urls.length > 1 && (
          <span className="absolute -top-1.5 -right-1.5 bg-[#e378ac] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
            {urls.length}
          </span>
        )}
        <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-bold transition">View</span>
        </div>
      </button>
    </>
  )
}
