import { FolderOpen, Globe, Library, Settings, Film, Music, Clock } from 'lucide-react'
import { useUIStore } from '@renderer/stores/ui.store'
import { useLibraryStore } from '@renderer/stores/library.store'
import { formatTime } from '@renderer/lib/utils'
import { cn } from '@renderer/lib/utils'

export function HomeScreen({ onOpenFile }: { onOpenFile: () => void }) {
  const ui = useUIStore()
  const lib = useLibraryStore()

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-black text-white px-8 py-6 overflow-y-auto">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mb-3 shadow-flux-glow">
          <span className="text-3xl font-black text-white">F</span>
        </div>
        <h1 className="text-2xl font-black gradient-text tracking-widest">FLUX</h1>
        <p className="text-xs text-white/30 mt-1 tracking-wider">PLAY EVERYTHING. PERFECTLY.</p>
      </div>

      {/* Quick open buttons */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={onOpenFile}
          className="flex items-center gap-2 px-5 py-2.5 btn-primary rounded-xl"
        >
          <FolderOpen size={15} />
          <span className="text-sm">Open File</span>
        </button>
        <button
          onClick={() => ui.setActiveModal('openUrl')}
          className="flex items-center gap-2 px-5 py-2.5 glass hover:bg-white/10 rounded-xl transition-all text-white/70 hover:text-white text-sm"
        >
          <Globe size={15} />
          <span>Open URL</span>
        </button>
      </div>

      {/* Recent files */}
      {lib.recentFiles.length > 0 && (
        <div className="w-full max-w-lg">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={13} className="text-white/30" />
            <span className="text-xs text-white/40 uppercase tracking-wider">Recent</span>
          </div>
          <div className="space-y-1">
            {lib.recentFiles.slice(0, 8).map((f, i) => (
              <button
                key={i}
                onClick={() => window.fluxAPI.loadFile(f.path)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] text-left transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                  <Film size={12} className="text-white/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/70 group-hover:text-white truncate transition-colors">
                    {f.title || f.path.split(/[\\/]/).pop()}
                  </div>
                  <div className="text-[10px] text-white/25 font-mono mt-0.5">
                    {formatTime(f.duration)}
                    {f.watchedPercent > 0 && ` • ${Math.round(f.watchedPercent)}% watched`}
                  </div>
                </div>
                {/* Mini progress bar */}
                {f.watchedPercent > 0 && (
                  <div className="w-16 h-0.5 bg-white/10 rounded-full flex-shrink-0">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${f.watchedPercent}%` }}
                    />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard shortcut hints */}
      <div className="mt-auto pt-6 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {[
          ['Space', 'Play/Pause'],
          ['F', 'Fullscreen'],
          ['Ctrl+O', 'Open File'],
          ['L', 'Playlist'],
          ['E', 'Equalizer'],
          ['I', 'Info'],
        ].map(([key, label]) => (
          <span key={key} className="text-[10px] text-white/20">
            <kbd className="font-mono bg-white/[0.06] px-1 py-0.5 rounded text-white/30">{key}</kbd>
            {' '}{label}
          </span>
        ))}
      </div>
    </div>
  )
}
