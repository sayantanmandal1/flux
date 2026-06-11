import { useEffect, useRef } from 'react'
import { useUIStore } from '@renderer/stores/ui.store'
import { usePlayerStore } from '@renderer/stores/player.store'
import { ASPECT_RATIOS } from '@shared/constants'
import {
  Play, Pause, FolderOpen, Globe, Camera, Subtitles,
  Sliders, Layers, Info, RotateCcw, Volume2, VolumeX,
  ExternalLink
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'

export function ContextMenu() {
  const ui = useUIStore()
  const player = usePlayerStore()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        ui.closeContextMenu()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!ui.contextMenu.open) return null

  const item = (
    label: string,
    handler: () => void,
    icon?: React.ReactNode,
    disabled = false
  ) => (
    <button
      onClick={() => { if (!disabled) { handler(); ui.closeContextMenu() } }}
      className={cn(
        'w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs transition-colors rounded',
        disabled
          ? 'text-white/20 cursor-default'
          : 'text-white/70 hover:text-white hover:bg-white/10 cursor-pointer'
      )}
      disabled={disabled}
    >
      {icon && <span className="w-3.5 flex-shrink-0 text-white/40">{icon}</span>}
      <span>{label}</span>
    </button>
  )

  const separator = () => <div className="my-1 h-px bg-white/[0.06] mx-3" />

  const audioTracks = player.tracks.filter((t) => t.type === 'audio')
  const subTracks = player.tracks.filter((t) => t.type === 'sub')
  const videoTracks = player.tracks.filter((t) => t.type === 'video')

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] glass-dark rounded-xl py-1.5 shadow-glass-lg w-56 overflow-hidden"
      style={{
        left: Math.min(ui.contextMenu.x, window.innerWidth - 230),
        top: Math.min(ui.contextMenu.y, window.innerHeight - 400),
      }}
    >
      {item(
        player.isPlaying ? 'Pause' : 'Play',
        () => window.fluxAPI.playPause(),
        player.isPlaying ? <Pause size={12} /> : <Play size={12} />
      )}
      {separator()}

      {item('Open File…', () => {
        window.fluxAPI.openFileDialog().then((files) => {
          if (files?.[0]) window.fluxAPI.loadFile(files[0])
        })
      }, <FolderOpen size={12} />)}
      {item('Open URL…', () => ui.setActiveModal('openUrl'), <Globe size={12} />)}
      {separator()}

      {/* Audio tracks submenu */}
      {audioTracks.length > 0 && (
        <>
          <div className="px-3 py-1 text-[10px] text-white/30 uppercase tracking-wider">Audio Track</div>
          {audioTracks.map((t) =>
            item(
              t.title || t.lang || `Track ${t.id}`,
              () => window.fluxAPI.setAudioTrack(t.id),
              undefined,
              false
            )
          )}
          {separator()}
        </>
      )}

      {/* Subtitle tracks submenu */}
      {subTracks.length > 0 && (
        <>
          <div className="px-3 py-1 text-[10px] text-white/30 uppercase tracking-wider">Subtitles</div>
          {item('Disable subtitles', () => window.fluxAPI.setSubTrack(false))}
          {subTracks.map((t) =>
            item(
              t.title || t.lang || `Sub ${t.id}`,
              () => window.fluxAPI.setSubTrack(t.id)
            )
          )}
          {item('Load subtitle file…', () => {
            window.fluxAPI.openSubtitleDialog().then((f) => {
              if (f) window.fluxAPI.addSubtitleFile(f)
            })
          }, <Subtitles size={12} />)}
          {separator()}
        </>
      )}

      {/* Aspect ratio */}
      <div className="px-3 py-1 text-[10px] text-white/30 uppercase tracking-wider">Aspect Ratio</div>
      {ASPECT_RATIOS.map((ar) =>
        item(ar.label, () => window.fluxAPI.setAspect(ar.value))
      )}
      {separator()}

      {/* Panel toggles */}
      {item('Equalizer', () => ui.togglePanel('equalizer'), <Sliders size={12} />)}
      {item('Video Filters', () => ui.togglePanel('filters'), <Layers size={12} />)}
      {item('Media Info', () => ui.togglePanel('mediaInfo'), <Info size={12} />)}
      {separator()}

      {item('Screenshot', () => window.fluxAPI.takeScreenshot(), <Camera size={12} />)}
      {item(player.muted ? 'Unmute' : 'Mute', () => window.fluxAPI.setMuted(!player.muted),
        player.muted ? <Volume2 size={12} /> : <VolumeX size={12} />
      )}
      {item('Reset speed to 1×', () => window.fluxAPI.setSpeed(1.0), <RotateCcw size={12} />)}
    </div>
  )
}
