import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { usePlayerStore } from '@renderer/stores/player.store'
import { usePlayerEngine } from '@renderer/contexts/usePlayerEngine'
import { SPEED_PRESETS } from '@shared/constants'
import { cn } from '@renderer/lib/utils'

export function SpeedControl() {
  const player = usePlayerStore()
  const engine = usePlayerEngine()
  const [open, setOpen] = useState(false)

  const setSpeed = (s: number) => {
    engine.setSpeed(s)
    setOpen(false)
  }

  return (
    <div className="relative no-drag">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-mono transition-all duration-150',
          player.speed !== 1.0
            ? 'text-purple-300 bg-purple-500/15 hover:bg-purple-500/25'
            : 'text-white/50 hover:text-white hover:bg-white/10'
        )}
        title="Playback Speed"
      >
        {player.speed.toFixed(2)}×
        <ChevronDown size={10} className={cn('transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-2 right-0 z-50 glass-dark rounded-xl py-1 shadow-glass-lg min-w-[90px]">
            {SPEED_PRESETS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-white/10 transition-colors',
                  player.speed === s && 'text-purple-400 bg-purple-500/10'
                )}
              >
                {s === 1.0 ? '1.00× (Normal)' : `${s.toFixed(2)}×`}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
