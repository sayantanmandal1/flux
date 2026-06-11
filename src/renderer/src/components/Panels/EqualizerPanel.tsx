import { useState } from 'react'
import { usePlayerStore } from '@renderer/stores/player.store'
import { EQ_BANDS, EQ_PRESETS } from '@shared/constants'
import { cn } from '@renderer/lib/utils'
import { RotateCcw, Power } from 'lucide-react'

export function EqualizerPanel() {
  const player = usePlayerStore()
  const [bands, setBands] = useState<number[]>(Array(15).fill(0))
  const [enabled, setEnabled] = useState(false)
  const [presetName, setPresetName] = useState('Flat')

  const handleBandChange = (index: number, value: number) => {
    const next = [...bands]
    next[index] = value
    setBands(next)
    window.fluxAPI.setEqualizer(next, enabled).catch(() => {})
  }

  const applyPreset = (name: string) => {
    const preset = EQ_PRESETS[name as keyof typeof EQ_PRESETS]
    if (!preset) return
    const b = [...preset] as number[]
    setBands(b)
    setPresetName(name)
    if (enabled) window.fluxAPI.setEqualizer(b, true).catch(() => {})
  }

  const toggleEnabled = () => {
    const next = !enabled
    setEnabled(next)
    window.fluxAPI.setEqualizer(bands, next).catch(() => {})
  }

  const reset = () => {
    const flat = Array(15).fill(0)
    setBands(flat)
    setPresetName('Flat')
    window.fluxAPI.setEqualizer(flat, enabled).catch(() => {})
  }

  return (
    <div className="flex flex-col h-full text-white">
      <div className="panel-header">
        <span className="panel-title">Equalizer</span>
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white"
            title="Reset to flat"
          >
            <RotateCcw size={13} />
          </button>
          <button
            onClick={toggleEnabled}
            title={enabled ? 'Disable EQ' : 'Enable EQ'}
            className={cn(
              'p-1.5 rounded transition-all',
              enabled
                ? 'text-purple-400 bg-purple-500/20 hover:bg-purple-500/30'
                : 'text-white/40 hover:bg-white/10 hover:text-white'
            )}
          >
            <Power size={13} />
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div className="text-[10px] text-white/40 mb-2 uppercase tracking-wider">Preset</div>
        <div className="grid grid-cols-3 gap-1">
          {Object.keys(EQ_PRESETS).map((name) => (
            <button
              key={name}
              onClick={() => applyPreset(name)}
              className={cn(
                'px-2 py-1 rounded text-[10px] font-medium truncate transition-all',
                presetName === name
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                  : 'bg-white/[0.05] text-white/50 hover:bg-white/10 hover:text-white'
              )}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Band sliders */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className={cn('transition-opacity', !enabled && 'opacity-40 pointer-events-none')}>
          <div className="flex items-end justify-between gap-1.5 h-40">
            {EQ_BANDS.map((freq, i) => (
              <div key={freq} className="flex flex-col items-center gap-1 flex-1">
                <span className={cn(
                  'text-[9px] font-mono tabular-nums',
                  bands[i] > 0 ? 'text-green-400' : bands[i] < 0 ? 'text-red-400' : 'text-white/30'
                )}>
                  {bands[i] > 0 ? '+' : ''}{bands[i]}
                </span>
                <input
                  type="range"
                  className="eq-slider"
                  min={-20}
                  max={20}
                  step={0.5}
                  value={bands[i]}
                  onChange={(e) => handleBandChange(i, Number(e.target.value))}
                  title={`${freq < 1000 ? freq : `${freq / 1000}k`}Hz: ${bands[i]}dB`}
                  style={{
                    background: `linear-gradient(to bottom, rgba(255,255,255,0.12) ${50 - (bands[i] / 20) * 50}%, #7C3AED ${50 - (bands[i] / 20) * 50}%)`,
                  }}
                />
                <span className="text-[8px] text-white/25 font-mono">
                  {freq >= 1000 ? `${freq / 1000}k` : freq}
                </span>
              </div>
            ))}
          </div>
          {/* dB axis */}
          <div className="flex justify-between mt-2 text-[8px] text-white/20 font-mono">
            <span>+20dB</span>
            <span>0</span>
            <span>-20dB</span>
          </div>
        </div>
      </div>
    </div>
  )
}
