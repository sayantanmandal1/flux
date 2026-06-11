import {
  Play, Pause, SkipBack, SkipForward, Square,
  Maximize2, Minimize2, PictureInPicture2, List,
  Subtitles, Sliders, Layers, Info, Library,
  Camera, Repeat, Shuffle, ChevronDown
} from 'lucide-react'
import { usePlayerStore } from '@renderer/stores/player.store'
import { useUIStore } from '@renderer/stores/ui.store'
import { usePlayerEngine } from '@renderer/contexts/usePlayerEngine'
import { ProgressBar } from './ProgressBar'
import { VolumeControl } from './VolumeControl'
import { SpeedControl } from './SpeedControl'
import { formatTime } from '@renderer/lib/utils'
import { cn } from '@renderer/lib/utils'

export function Controls() {
  const player = usePlayerStore()
  const ui = useUIStore()
  const engine = usePlayerEngine()

  const handlePlayPause = () => engine.playPause()
  const handleStop = () => engine.stop()
  const handlePrev = () => window.fluxAPI.loadPrev().catch(() => {})
  const handleNext = () => window.fluxAPI.loadNext().catch(() => {})
  const handleFullscreen = () => {
    window.fluxAPI.setFullscreen(!player.isFullscreen)
    player.setFullscreen(!player.isFullscreen)
  }
  const handleScreenshot = () => engine.takeScreenshot()

  const controlBtn = (
    handler: () => void,
    Icon: React.ElementType,
    title: string,
    active?: boolean,
    extraClass?: string
  ) => (
    <button
      onClick={handler}
      title={title}
      className={cn(
        'p-1.5 rounded-lg transition-all duration-150 no-drag',
        active
          ? 'text-purple-400 bg-purple-500/15 hover:bg-purple-500/25'
          : 'text-white/60 hover:text-white hover:bg-white/10',
        extraClass
      )}
    >
      <Icon size={16} />
    </button>
  )

  return (
    <div
      className="controls-gradient px-0 pb-0 pt-6"
      onMouseEnter={() => ui.showControlsNow()}
    >
      {/* Progress bar */}
      <ProgressBar />

      {/* Control row */}
      <div className="flex items-center justify-between px-4 pb-3 no-drag">
        {/* Left cluster: playback controls */}
        <div className="flex items-center gap-1">
          {controlBtn(handlePrev, SkipBack, 'Previous (P)')}

          {/* Play/Pause — larger */}
          <button
            onClick={handlePlayPause}
            title={player.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className="w-9 h-9 rounded-full flex items-center justify-center
                       bg-white hover:bg-white/90 transition-all duration-150
                       shadow-flux-glow hover:shadow-flux-glow-lg no-drag"
          >
            {player.isPlaying
              ? <Pause size={16} className="text-black fill-black" />
              : <Play size={17} className="text-black fill-black ml-0.5" />
            }
          </button>

          {controlBtn(handleNext, SkipForward, 'Next (N)')}
          {controlBtn(handleStop, Square, 'Stop')}

          {/* Volume */}
          <div className="ml-2">
            <VolumeControl />
          </div>

          {/* Title + time */}
          <div className="ml-3 flex flex-col min-w-0">
            {player.mediaTitle && (
              <span className="text-xs font-medium text-white/80 truncate max-w-[200px]">
                {player.mediaTitle}
              </span>
            )}
            <span className="text-[10px] font-mono text-white/40">
              {formatTime(player.position)}
              {player.duration > 0 && <> / {formatTime(player.duration)}</>}
            </span>
          </div>
        </div>

        {/* Right cluster: panels + view */}
        <div className="flex items-center gap-1">
          {/* Speed control */}
          <SpeedControl />

          <div className="w-px h-4 bg-white/10 mx-1" />

          {/* A-B Loop indicators */}
          {ui.abLoopMode !== 'none' && (
            <div className="flex items-center gap-1 mr-1">
              <span className={cn(
                'text-[10px] font-mono px-1.5 py-0.5 rounded',
                ui.abLoopMode === 'a-set' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-orange-500/20 text-orange-400'
              )}>
                {ui.abLoopMode === 'a-set' ? 'A-B [A]' : 'A-B ▶'}
              </span>
            </div>
          )}

          {/* Panel toggles */}
          {controlBtn(() => ui.togglePanel('playlist'),   List,             'Playlist (L)',   ui.activePanel === 'playlist')}
          {controlBtn(() => ui.togglePanel('subtitles'),  Subtitles,        'Subtitles (U)',  ui.activePanel === 'subtitles')}
          {controlBtn(() => ui.togglePanel('equalizer'),  Sliders,          'Equalizer (E)',  ui.activePanel === 'equalizer')}
          {controlBtn(() => ui.togglePanel('filters'),    Layers,           'Video Filters',  ui.activePanel === 'filters')}
          {controlBtn(() => ui.togglePanel('chapters'),   List,             'Chapters',       ui.activePanel === 'chapters')}
          {controlBtn(() => ui.togglePanel('mediaInfo'),  Info,             'Media Info (I)', ui.activePanel === 'mediaInfo')}
          {controlBtn(() => ui.togglePanel('library'),    Library,          'Library',        ui.activePanel === 'library')}

          <div className="w-px h-4 bg-white/10 mx-1" />

          {controlBtn(handleScreenshot, Camera, 'Screenshot (S)')}
          {controlBtn(
            () => ui.setActiveModal('pip'),
            PictureInPicture2,
            'Picture-in-Picture (Ctrl+P)'
          )}
          {controlBtn(
            handleFullscreen,
            player.isFullscreen ? Minimize2 : Maximize2,
            'Fullscreen (F)'
          )}
        </div>
      </div>
    </div>
  )
}
