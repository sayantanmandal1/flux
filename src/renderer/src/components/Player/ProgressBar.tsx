import { useState, useRef, useEffect } from 'react'
import { usePlayerStore } from '@renderer/stores/player.store'
import { useUIStore } from '@renderer/stores/ui.store'
import { usePlayerEngine } from '@renderer/contexts/usePlayerEngine'
import { formatTime } from '@renderer/lib/utils'

interface TooltipState {
  visible: boolean
  x: number
  time: string
  chapterLabel?: string
}

export function ProgressBar() {
  const player = usePlayerStore()
  const ui = useUIStore()
  const engine = usePlayerEngine()
  const trackRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, time: '0:00' })
  const [isDragging, setIsDragging] = useState(false)

  const getProgress = (e: React.MouseEvent | MouseEvent): number => {
    if (!trackRef.current) return 0
    const rect = trackRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    return x / rect.width
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!trackRef.current || player.duration <= 0) return
    const progress = getProgress(e)
    const time = progress * player.duration
    const rect = trackRef.current.getBoundingClientRect()

    // Find chapter for this position
    const chapter = player.chapters.findLast?.((c) => c.time <= time)

    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      time: formatTime(time),
      chapterLabel: chapter?.title,
    })

    if (isDragging) {
      engine.seek(time)
    }
  }

  const handleMouseLeave = () => {
    if (!isDragging) setTooltip((t) => ({ ...t, visible: false }))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    const progress = getProgress(e)
    engine.seek(progress * player.duration)
  }

  useEffect(() => {
    const handleUp = (e: MouseEvent) => {
      if (!isDragging) return
      setIsDragging(false)
      setTooltip((t) => ({ ...t, visible: false }))
      const progress = getProgress(e)
      engine.seek(progress * player.duration)
    }
    const handleMove = (e: MouseEvent) => {
      if (!isDragging) return
      const progress = getProgress(e)
      engine.seek(progress * player.duration)
    }
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('mousemove', handleMove)
    return () => {
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('mousemove', handleMove)
    }
  }, [isDragging, player.duration, engine])

  const progressPct = player.duration > 0 ? (player.position / player.duration) * 100 : 0

  return (
    <div className="relative w-full px-4 pb-1 group">
      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute bottom-full mb-2 pointer-events-none z-50 transform -translate-x-1/2 transition-opacity duration-100"
          style={{ left: tooltip.x + 16 }}
        >
          <div className="glass-dark px-2 py-1 text-xs text-white/90 whitespace-nowrap">
            {tooltip.chapterLabel && (
              <div className="text-purple-300 text-[10px] truncate max-w-[160px]">
                {tooltip.chapterLabel}
              </div>
            )}
            <div className="font-mono font-medium">{tooltip.time}</div>
          </div>
        </div>
      )}

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-1 group-hover:h-1.5 transition-all duration-150 rounded-full bg-white/10 cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
      >
        {/* Filled (played) portion */}
        <div
          className="absolute h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-[width] duration-75"
          style={{ width: `${progressPct}%` }}
        />

        {/* Chapter markers */}
        {player.chapters.map((chapter, idx) => {
          if (player.duration <= 0) return null
          const pct = (chapter.time / player.duration) * 100
          return (
            <div
              key={idx}
              className="absolute top-0 h-full w-0.5 bg-white/30 pointer-events-none"
              style={{ left: `${pct}%` }}
            />
          )
        })}

        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-flux-glow
                     opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
          style={{ left: `${progressPct}%` }}
        />
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-1 text-[10px] text-white/40 font-mono px-0.5">
        <span>{formatTime(player.position)}</span>
        <span>{formatTime(player.duration)}</span>
      </div>
    </div>
  )
}
