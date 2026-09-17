"use client"
import { useRef, useState } from "react"

export default function VoiceNotePlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause(); setPlaying(false) }
    else { a.play(); setPlaying(true) }
  }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current
    if (!a || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    a.currentTime = pct * duration
    setCurrentTime(a.currentTime)
  }

  const fmt = (s: number) => {
    if (!isFinite(s) || isNaN(s)) return "0:00"
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex items-center gap-2.5 min-w-[200px]">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => { setPlaying(false); setCurrentTime(0) }}
      />
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-[#e378ac] flex items-center justify-center shrink-0 hover:bg-[#e378ac]/80 transition text-white text-xs font-bold"
        title={playing ? "Pause" : "Play"}
      >
        {playing ? "⏸" : "▶"}
      </button>
      <div className="flex-1">
        <div
          className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden cursor-pointer"
          onClick={seek}
        >
          <div
            className="h-full bg-[#e378ac] rounded-full"
            style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[10px] text-gray-600">{fmt(currentTime)}</span>
          <span className="text-[10px] text-gray-600">{fmt(duration)}</span>
        </div>
      </div>
    </div>
  )
}
