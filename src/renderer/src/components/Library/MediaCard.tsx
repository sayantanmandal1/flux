import { formatTime, formatFileSize } from '@renderer/lib/utils'
import { cn } from '@renderer/lib/utils'
import { Play, Film, Music } from 'lucide-react'
import type { MediaItem } from '@shared/types'

interface MediaCardProps {
  item: MediaItem
  listMode?: boolean
}

export function MediaCard({ item, listMode }: MediaCardProps) {
  const handleOpen = () => {
    window.fluxAPI.loadFile(item.filePath)
  }

  const percent = item.watchedPercent ?? 0

  if (listMode) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.05] cursor-pointer group transition-colors"
        onDoubleClick={handleOpen}
      >
        <div className="w-8 h-8 rounded bg-white/[0.05] flex items-center justify-center flex-shrink-0">
          {item.type === 'audio'
            ? <Music size={14} className="text-white/30" />
            : <Film size={14} className="text-white/30" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-white/80 truncate">{item.title}</div>
          <div className="text-[10px] text-white/30 font-mono mt-0.5">
            {formatTime(item.duration)}
            {item.artist && ` • ${item.artist}`}
          </div>
        </div>
        {percent > 0 && (
          <div className="w-10 text-right">
            <span className="text-[10px] text-white/30">{Math.round(percent)}%</span>
          </div>
        )}
        <button
          onClick={handleOpen}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
        >
          <Play size={10} />
        </button>
      </div>
    )
  }

  return (
    <div
      className="group relative cursor-pointer rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.06] hover:border-white/15 transition-all"
      onDoubleClick={handleOpen}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gradient-to-br from-white/[0.04] to-transparent flex items-center justify-center relative">
        {item.coverArtPath ? (
          <img src={`file://${item.coverArtPath}`} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="text-white/10">
            {item.type === 'audio' ? <Music size={24} /> : <Film size={24} />}
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          <button
            onClick={handleOpen}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <Play size={16} className="text-white ml-0.5" />
          </button>
        </div>

        {/* Progress bar at bottom of thumbnail */}
        {percent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
            <div
              className="h-full bg-purple-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}

        {/* Resolution badge */}
        {item.width && item.height && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[8px] font-mono bg-black/60 rounded text-white/60">
            {item.height}p
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        <div className="text-[11px] font-medium text-white/80 truncate">{item.title}</div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[9px] text-white/30 font-mono">{formatTime(item.duration)}</span>
          <span className="text-[9px] text-white/20">{formatFileSize(item.size)}</span>
        </div>
      </div>
    </div>
  )
}
