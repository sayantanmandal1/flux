import { useState } from 'react'
import { cn } from '@renderer/lib/utils'

interface FilterSlider {
  label: string
  prop: string
  min: number
  max: number
  step: number
  default: number
  unit?: string
}

const COLOR_SLIDERS: FilterSlider[] = [
  { label: 'Brightness', prop: 'brightness', min: -100, max: 100, step: 1, default: 0 },
  { label: 'Contrast',   prop: 'contrast',   min: -100, max: 100, step: 1, default: 0 },
  { label: 'Saturation', prop: 'saturation', min: -100, max: 100, step: 1, default: 0 },
  { label: 'Hue',        prop: 'hue',        min: -100, max: 100, step: 1, default: 0 },
  { label: 'Gamma',      prop: 'gamma',      min: -100, max: 100, step: 1, default: 0 },
]

const VIDEO_FILTERS = [
  { name: 'Denoise',       filterName: 'hqdn3d', param: '', description: 'Reduce noise / grain' },
  { name: 'Sharpen',       filterName: 'unsharp', param: '5:5:0.8:5:5:0.4', description: 'Increase edge sharpness' },
  { name: 'Deinterlace',   filterName: 'yadif',   param: 'mode=1', description: 'Fix interlaced video' },
  { name: 'Super Res (2×)', filterName: 'scale', param: 'w=iw*2:h=ih*2:flags=lanczos', description: 'Upscale with Lanczos' },
  { name: 'Flip H',        filterName: 'hflip',  param: '', description: 'Mirror horizontally' },
  { name: 'Flip V',        filterName: 'vflip',  param: '', description: 'Mirror vertically' },
  { name: 'Rotate 90°',   filterName: 'transpose', param: '1', description: 'Rotate 90° clockwise' },
  { name: 'Grayscale',    filterName: 'hue', param: 's=0', description: 'Remove color' },
]

export function VideoFiltersPanel() {
  const [colors, setColors] = useState<Record<string, number>>(
    Object.fromEntries(COLOR_SLIDERS.map((s) => [s.prop, s.default]))
  )
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const [hdrEnabled, setHdrEnabled] = useState(true)
  const [zoom, setZoom] = useState(0)

  const handleColor = (prop: string, val: number) => {
    setColors((c) => ({ ...c, [prop]: val }))
    window.fluxAPI.setColor(prop, val)
  }

  const resetColors = () => {
    const def = Object.fromEntries(COLOR_SLIDERS.map((s) => [s.prop, s.default]))
    setColors(def)
    COLOR_SLIDERS.forEach((s) => window.fluxAPI.setColor(s.prop, s.default))
  }

  const toggleFilter = (name: string, filterName: string, param: string) => {
    const next = new Set(activeFilters)
    if (next.has(name)) {
      next.delete(name)
      window.fluxAPI.setVideoFilter(filterName, '')
    } else {
      next.add(name)
      window.fluxAPI.setVideoFilter(filterName, param)
    }
    setActiveFilters(next)
  }

  const handleZoom = (val: number) => {
    setZoom(val)
    window.fluxAPI.zoom(val)
  }

  return (
    <div className="flex flex-col h-full text-white">
      <div className="panel-header">
        <span className="panel-title">Video Filters & Colors</span>
        <button
          onClick={resetColors}
          className="text-xs text-white/40 hover:text-white transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Color adjustments */}
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-3">Color</div>
          <div className="space-y-3">
            {COLOR_SLIDERS.map((s) => (
              <div key={s.prop}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-white/60">{s.label}</span>
                  <span className={cn(
                    'text-xs font-mono',
                    colors[s.prop] !== 0 ? 'text-purple-300' : 'text-white/30'
                  )}>
                    {colors[s.prop] >= 0 ? '+' : ''}{colors[s.prop]}
                  </span>
                </div>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={colors[s.prop]}
                  onChange={(e) => handleColor(s.prop, Number(e.target.value))}
                  className="w-full"
                  style={{
                    background: `linear-gradient(to right, #7C3AED ${(colors[s.prop] - s.min) / (s.max - s.min) * 100}%, rgba(255,255,255,0.12) ${(colors[s.prop] - s.min) / (s.max - s.min) * 100}%)`
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Zoom */}
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Zoom</div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={-2}
              max={2}
              step={0.05}
              value={zoom}
              onChange={(e) => handleZoom(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs font-mono text-white/50 w-10 text-right">
              {zoom.toFixed(2)}
            </span>
          </div>
          {zoom !== 0 && (
            <button
              onClick={() => handleZoom(0)}
              className="mt-1 text-xs text-white/30 hover:text-white transition-colors"
            >
              Reset zoom
            </button>
          )}
        </div>

        {/* HDR */}
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">HDR</div>
          <button
            onClick={() => {
              const next = !hdrEnabled
              setHdrEnabled(next)
              window.fluxAPI.mpvCommand(['set_property', 'tone-mapping', next ? 'hable' : 'clip'])
            }}
            className={cn(
              'w-full py-2 rounded-xl text-sm font-medium transition-all',
              hdrEnabled
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                : 'bg-white/[0.05] text-white/40 hover:bg-white/10'
            )}
          >
            HDR Tone Mapping: {hdrEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Video filters */}
        <div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Filters</div>
          <div className="grid grid-cols-2 gap-1.5">
            {VIDEO_FILTERS.map((f) => (
              <button
                key={f.name}
                onClick={() => toggleFilter(f.name, f.filterName, f.param)}
                title={f.description}
                className={cn(
                  'px-2 py-2 rounded-lg text-xs text-left transition-all',
                  activeFilters.has(f.name)
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                    : 'bg-white/[0.04] text-white/50 hover:bg-white/10 hover:text-white border border-transparent'
                )}
              >
                <div className="font-medium">{f.name}</div>
                <div className="text-[9px] opacity-60 mt-0.5">{f.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
