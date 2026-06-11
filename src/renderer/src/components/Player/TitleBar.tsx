import { useState, useEffect } from 'react'
import { Minus, Square, X, Menu, Settings, FolderOpen, Globe } from 'lucide-react'
import { usePlayerStore } from '@renderer/stores/player.store'
import { useUIStore } from '@renderer/stores/ui.store'
import { cn } from '@renderer/lib/utils'

export function TitleBar() {
  const player = usePlayerStore()
  const ui = useUIStore()
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.fluxAPI.isMaximized().then(setIsMaximized)
    window.fluxAPI.on('window:maximized-changed', (val: boolean) => setIsMaximized(val))
  }, [])

  return (
    <div
      className="flex items-center h-9 bg-black/90 backdrop-blur border-b border-white/[0.05] flex-shrink-0 relative z-50 drag-region"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left: sidebar toggle + logo */}
      <div className="flex items-center gap-2 px-3 no-drag">
        <button
          onClick={() => ui.toggleSidebar()}
          className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          title="Toggle sidebar"
        >
          <Menu size={14} />
        </button>

        {/* Logo mark */}
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
            <span className="text-[9px] font-black text-white leading-none">F</span>
          </div>
          <span className="text-xs font-bold gradient-text tracking-wider">FLUX</span>
        </div>
      </div>

      {/* Center: title */}
      <div className="flex-1 flex items-center justify-center pointer-events-none">
        {player.mediaTitle ? (
          <span className="text-xs text-white/50 truncate max-w-[400px] font-medium">
            {player.mediaTitle}
          </span>
        ) : (
          <span className="text-xs text-white/20 font-medium">
            The Ultimate Media Player
          </span>
        )}
      </div>

      {/* Right: menu actions + window controls */}
      <div className="flex items-center no-drag">
        <button
          onClick={() => window.fluxAPI.openFileDialog().then((files) => { if (files?.[0]) window.fluxAPI.loadFile(files[0]) })}
          className="px-2 py-1 text-[11px] text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors h-9 flex items-center gap-1"
          title="Open File"
        >
          <FolderOpen size={12} />
        </button>
        <button
          onClick={() => ui.setActiveModal('openUrl')}
          className="px-2 py-1 text-[11px] text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors h-9 flex items-center gap-1"
          title="Open URL"
        >
          <Globe size={12} />
        </button>
        <button
          onClick={() => ui.setActiveModal('settings')}
          className="px-2 py-1 text-[11px] text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors h-9 flex items-center gap-1"
          title="Settings"
        >
          <Settings size={12} />
        </button>

        <div className="w-px h-4 bg-white/10 mx-1" />

        {/* Window controls */}
        <button
          onClick={() => window.fluxAPI.minimize()}
          className="w-11 h-9 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          title="Minimize"
        >
          <Minus size={12} />
        </button>
        <button
          onClick={() => window.fluxAPI.maximize()}
          className="w-11 h-9 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized
            ? <svg width="11" height="11" viewBox="0 0 10 10" fill="currentColor"><rect x="2" y="0" width="8" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2"/><rect x="0" y="2" width="8" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2"/></svg>
            : <Square size={11} />
          }
        </button>
        <button
          onClick={() => window.fluxAPI.close()}
          className="w-11 h-9 flex items-center justify-center text-white/40 hover:text-white hover:bg-red-600 transition-colors rounded-tr"
          title="Close"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
