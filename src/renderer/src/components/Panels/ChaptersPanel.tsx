import { usePlayerStore } from '@renderer/stores/player.store'
import { formatTime } from '@renderer/lib/utils'
import { cn } from '@renderer/lib/utils'

export function ChaptersPanel() {
  const player = usePlayerStore()

  if (player.chapters.length === 0) {
    return (
      <div className="flex flex-col h-full text-white">
        <div className="panel-header">
          <span className="panel-title">Chapters</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-white/30">No chapters in this file</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full text-white">
      <div className="panel-header">
        <span className="panel-title">Chapters</span>
        <span className="text-[10px] text-white/30">{player.chapters.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {player.chapters.map((chapter, idx) => (
          <button
            key={idx}
            onClick={() => window.fluxAPI.seekChapter(idx)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.05] transition-colors',
              player.currentChapter === idx && 'bg-purple-600/10 border-l-2 border-purple-500'
            )}
          >
            <span className={cn(
              'text-[10px] font-mono w-4 text-center flex-shrink-0',
              player.currentChapter === idx ? 'text-purple-400' : 'text-white/30'
            )}>
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className={cn(
                'text-xs font-medium truncate',
                player.currentChapter === idx ? 'text-white' : 'text-white/70'
              )}>
                {chapter.title}
              </div>
              <div className="text-[10px] text-white/30 font-mono mt-0.5">
                {formatTime(chapter.time)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
