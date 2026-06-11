import { useEffect, useRef } from 'react'
import { usePlayerStore } from '@renderer/stores/player.store'
import { useUIStore } from '@renderer/stores/ui.store'
import { usePlayerEngine } from '@renderer/contexts/usePlayerEngine'
import { cn } from '@renderer/lib/utils'

/**
 * VideoContainer is the transparent div that mpv renders into via --wid.
 * mpv renders its video directly into the parent window HWND at the OS level.
 * This div serves as the layout placeholder and interaction surface.
 */
export function VideoContainer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const player = usePlayerStore()
  const ui = useUIStore()
  const engine = usePlayerEngine()

  // Report video area bounds to main process every time layout changes.
  // The main process uses these bounds to reposition the mpv child window
  // so it perfectly overlaps the video area — this is how VLC-style embedding works.
  useEffect(() => {
    const reportBounds = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      if (rect.width < 10 || rect.height < 10) return
      // Multiply by devicePixelRatio to convert CSS pixels → physical pixels
      // (Win32 CreateWindowExA / MoveWindow use physical pixels)
      const dpr = window.devicePixelRatio || 1
      window.fluxAPI.setVideoAreaBounds({
        x: Math.round(rect.x * dpr),
        y: Math.round(rect.y * dpr),
        w: Math.round(rect.width * dpr),
        h: Math.round(rect.height * dpr),
      }).catch(() => {})
    }

    // Immediate report
    requestAnimationFrame(reportBounds)

    // Watch for size changes (panel open/close, window resize, fullscreen)
    const observer = new ResizeObserver(() => requestAnimationFrame(reportBounds))
    if (containerRef.current) observer.observe(containerRef.current)

    window.addEventListener('resize', reportBounds)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', reportBounds)
    }
  }, [ui.activePanel, ui.showSidebar, player.isFullscreen])

  const handleMouseMove = () => {
    ui.scheduleHideControls(3000)
  }

  const handleDoubleClick = () => {
    window.fluxAPI.setFullscreen(!player.isFullscreen)
    player.setFullscreen(!player.isFullscreen)
  }
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    ui.openContextMenu(e.clientX, e.clientY)
  }

  const handleClick = () => {
    ui.closeContextMenu()
  }

  // Mouse wheel — volume control over video area
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 5 : -5
    const newVol = Math.max(0, Math.min(200, player.volume + delta))
    engine.setVolume(newVol)
    ui.addNotification(`Volume: ${newVol}%`, 'info', 800)
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{
        // Transparent background — the native WS_CHILD video window renders
        // through this area via DWM composition (transparent Electron window).
        background: 'transparent',
        cursor: ui.showControls ? 'default' : 'none',
      }}
      onMouseMove={handleMouseMove}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
      onWheel={handleWheel}
    >
      {/* ─ HTML5 native video player ─ Handles MP4, WebM, OGG, MP3, WAV, FLAC, etc. ─ */}
      {/* Exactly like VSCode's built-in player — Chromium decodes natively, no subprocess needed */}
      <video
        ref={engine.videoRef}
        className={cn(
          'absolute inset-0 w-full h-full object-contain bg-black',
          engine.mode !== 'html5' && 'hidden'
        )}
        playsInline
        preload="metadata"
      />

      {/* ─ mpv renders here at the OS/DirectX level for non-HTML5 formats ─ */}
      {/* This div is the placeholder; video pixels come from the OS compositor */}

      {/* Buffering indicator */}
      {player.isBuffering && !player.isIdle && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 loading-ring" />
            <div className="absolute inset-2 rounded-full border-t-2 border-purple-500 animate-spin" />
          </div>
        </div>
      )}

      {/* A-B loop marker overlay */}
      {(player.abLoopA !== null || player.abLoopB !== null) && player.duration > 0 && (
        <div className="absolute bottom-20 left-0 right-0 h-0.5 pointer-events-none z-10">
          {player.abLoopA !== null && (
            <div
              className="absolute h-full w-0.5 bg-yellow-400 shadow-[0_0_6px_#facc15]"
              style={{ left: `${(player.abLoopA / player.duration) * 100}%` }}
            />
          )}
          {player.abLoopB !== null && (
            <div
              className="absolute h-full w-0.5 bg-orange-400 shadow-[0_0_6px_#fb923c]"
              style={{ left: `${(player.abLoopB / player.duration) * 100}%` }}
            />
          )}
        </div>
      )}

      {/* Engine badge — shows which player is active */}
      {!player.isIdle && (
        <div className="absolute top-3 right-3 pointer-events-none z-10 flex gap-1.5">
          {engine.mode === 'html5' ? (
            <div className="px-2 py-0.5 text-[10px] font-mono bg-blue-600/30 border border-blue-500/30 rounded text-blue-300">
              HTML5
            </div>
          ) : engine.mode === 'mpv' ? (
            <div className="px-2 py-0.5 text-[10px] font-mono bg-purple-600/30 border border-purple-500/30 rounded text-purple-300">
              mpv
            </div>
          ) : null}
          {player.hwdecActive && engine.mode === 'mpv' && (
            <div className="px-2 py-0.5 text-[10px] font-mono bg-green-600/30 border border-green-500/30 rounded text-green-300">
              HW
            </div>
          )}
        </div>
      )}
    </div>
  )
}
