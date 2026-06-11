import { useState } from 'react'
import { useLibraryStore } from '@renderer/stores/library.store'
import { usePlayerStore } from '@renderer/stores/player.store'
import { formatTime } from '@renderer/lib/utils'
import { Plus, Trash2, GripVertical, Play, ListMusic } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

export function PlaylistPanel() {
  const lib = useLibraryStore()
  const player = usePlayerStore()
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const addFiles = async () => {
    const files = await window.fluxAPI.openFileDialog()
    if (files) {
      files.forEach((f) => {
        lib.addToPlaylist({
          id: f,
          filePath: f,
          title: f.split(/[\\/]/).pop() || f,
        })
      })
    }
  }

  const playItem = (idx: number) => {
    const item = lib.playlist[idx]
    lib.setCurrentPlaylistIndex(idx)
    if (item.filePath) window.fluxAPI.loadFile(item.filePath)
    else if (item.url) window.fluxAPI.loadUrl(item.url)
  }

  return (
    <div className="flex flex-col h-full text-white">
      <div className="panel-header">
        <span className="panel-title">Playlist</span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-white/30">{lib.playlist.length} items</span>
          <button
            onClick={addFiles}
            className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white"
            title="Add files"
          >
            <Plus size={13} />
          </button>
          {lib.playlist.length > 0 && (
            <button
              onClick={() => lib.clearPlaylist()}
              className="p-1.5 rounded hover:bg-white/10 text-red-400/60 hover:text-red-400"
              title="Clear playlist"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {lib.playlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12 px-4">
            <ListMusic size={28} className="text-white/20" />
            <p className="text-sm text-white/30 text-center">
              Drop files here or click + to add
            </p>
            <button onClick={addFiles} className="btn-primary text-xs px-4 py-2">
              Add files
            </button>
          </div>
        ) : (
          lib.playlist.map((item, idx) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => { e.preventDefault() }}
              onDrop={() => {
                if (dragIdx !== null && dragIdx !== idx) {
                  lib.movePlaylistItem(dragIdx, idx)
                  setDragIdx(null)
                }
              }}
              className={cn(
                'flex items-center gap-2 px-3 py-2 group hover:bg-white/[0.05] cursor-pointer transition-colors',
                lib.currentPlaylistIndex === idx && 'bg-purple-600/10 border-l-2 border-l-purple-500'
              )}
              onDoubleClick={() => playItem(idx)}
            >
              <GripVertical size={12} className="text-white/20 flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-100" />
              <span className={cn(
                'text-[10px] font-mono w-5 text-center flex-shrink-0',
                lib.currentPlaylistIndex === idx ? 'text-purple-400' : 'text-white/25'
              )}>
                {lib.currentPlaylistIndex === idx ? '▶' : idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className={cn(
                  'text-xs truncate',
                  lib.currentPlaylistIndex === idx ? 'text-white font-medium' : 'text-white/70'
                )}>
                  {item.title}
                </div>
                {item.duration && (
                  <div className="text-[10px] text-white/30 font-mono">{formatTime(item.duration)}</div>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); playItem(idx) }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/20 text-white/60 hover:text-white transition-all"
              >
                <Play size={10} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); lib.removeFromPlaylist(item.id) }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
