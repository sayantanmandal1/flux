import { useRef } from 'react'
import { usePlayerStore } from '@renderer/stores/player.store'
import { Volume2, VolumeX, Volume1 } from 'lucide-react'
import { usePlayerEngine } from '@renderer/contexts/usePlayerEngine'
import { cn } from '@renderer/lib/utils'

export function VolumeControl() {
  const player = usePlayerStore()
  const engine = usePlayerEngine()

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    engine.setVolume(Number(e.target.value))
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const delta = e.deltaY < 0 ? 5 : -5
    engine.setVolume(Math.max(0, Math.min(200, player.volume + delta)))
  }

  const toggleMute = () => engine.setMuted(!player.muted)

  const VolumeIcon = player.muted || player.volume === 0
    ? VolumeX
    : player.volume < 50
    ? Volume1
    : Volume2

  return (
    <div className="flex items-center gap-2 no-drag" onWheel={handleWheel}>
      <button
        onClick={toggleMute}
        className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all duration-150"
        title={player.muted ? 'Unmute' : 'Mute'}
      >
        <VolumeIcon size={16} />
      </button>
      <div className="relative w-20 flex items-center">
        <input
          type="range"
          className="volume-slider w-full h-1 rounded-full cursor-pointer"
          min={0}
          max={200}
          step={1}
          value={player.muted ? 0 : player.volume}
          onChange={handleVolumeChange}
          title={`Volume: ${player.volume}%`}
          style={{
            background: `linear-gradient(to right, #7C3AED ${(player.muted ? 0 : player.volume) / 2}%, rgba(255,255,255,0.15) ${(player.muted ? 0 : player.volume) / 2}%)`,
          }}
        />
      </div>
      <span className="text-[10px] font-mono text-white/40 w-7 text-right tabular-nums">
        {player.muted ? 0 : player.volume}%
      </span>
    </div>
  )
}
