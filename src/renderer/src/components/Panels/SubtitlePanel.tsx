import { useState } from 'react'
import { usePlayerStore } from '@renderer/stores/player.store'
import { useUIStore } from '@renderer/stores/ui.store'
import { Plus, Search, X } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

export function SubtitlePanel() {
  const player = usePlayerStore()
  const ui = useUIStore()
  const [subDelay, setSubDelay] = useState(0)

  const subTracks = player.tracks.filter((t) => t.type === 'sub')

  const handleDelayChange = (val: number) => {
    setSubDelay(val)
    window.fluxAPI.setSubDelay(val)
  }

  const loadSubFile = async () => {
    const f = await window.fluxAPI.openSubtitleDialog()
    if (f) window.fluxAPI.addSubtitleFile(f)
  }

  return (
    <div className="flex flex-col h-full text-white">
      <div className="panel-header">
        <span className="panel-title">Subtitles</span>
        <div className="flex items-center gap-1">
          <button
            onClick={loadSubFile}
            title="Load subtitle file"
            className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white"
          >
            <Plus size={13} />
          </button>
          <button
            onClick={() => ui.setActiveModal('subtitleSearch')}
            title="Search OpenSubtitles"
            className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white"
          >
            <Search size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Track selection */}
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Track</div>
          <div className="space-y-1">
            <button
              onClick={() => window.fluxAPI.setSubTrack(false)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-xs transition-all',
                player.activeSubTrackId === 0
                  ? 'bg-purple-600/20 text-purple-300'
                  : 'text-white/60 hover:bg-white/10'
              )}
            >
              Disabled
            </button>
            {subTracks.map((t) => (
              <button
                key={t.id}
                onClick={() => window.fluxAPI.setSubTrack(t.id)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-xs transition-all',
                  player.activeSubTrackId === t.id
                    ? 'bg-purple-600/20 text-purple-300'
                    : 'text-white/60 hover:bg-white/10'
                )}
              >
                <div className="font-medium">{t.title || `Subtitle ${t.id}`}</div>
                <div className="text-[10px] text-white/30 mt-0.5">
                  {t.lang && <span>{t.lang.toUpperCase()} • </span>}
                  {t.codec && <span>{t.codec} • </span>}
                  {t.external && <span>External</span>}
                </div>
              </button>
            ))}
            {subTracks.length === 0 && (
              <div className="text-xs text-white/30 px-3 py-4 text-center">
                No subtitle tracks found
              </div>
            )}
          </div>
        </div>

        {/* Delay */}
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">
            Delay
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleDelayChange(subDelay - 0.1)}
              className="px-2 py-1 text-xs bg-white/[0.05] hover:bg-white/10 rounded-lg text-white/60 hover:text-white"
            >
              -0.1s
            </button>
            <span className="flex-1 text-center text-sm font-mono text-white">
              {subDelay >= 0 ? '+' : ''}{subDelay.toFixed(1)}s
            </span>
            <button
              onClick={() => handleDelayChange(subDelay + 0.1)}
              className="px-2 py-1 text-xs bg-white/[0.05] hover:bg-white/10 rounded-lg text-white/60 hover:text-white"
            >
              +0.1s
            </button>
          </div>
          <input
            type="range"
            min={-5}
            max={5}
            step={0.1}
            value={subDelay}
            onChange={(e) => handleDelayChange(Number(e.target.value))}
            className="w-full mt-2"
          />
          <button
            onClick={() => handleDelayChange(0)}
            className="mt-2 w-full text-xs text-white/30 hover:text-white transition-colors"
          >
            Reset delay
          </button>
        </div>
      </div>
    </div>
  )
}
