import { useEffect, useState } from 'react'
import { useLibraryStore } from '@renderer/stores/library.store'
import { usePlayerStore } from '@renderer/stores/player.store'
import { MediaCard } from './MediaCard'
import { FolderOpen, Grid, List, Search, Loader2, Film, Music } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import type { MediaItem } from '@shared/types'

export function MediaLibrary() {
  const lib = useLibraryStore()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!loaded) {
      window.fluxAPI.libraryGetAll().then((items) => {
        lib.setItems(items)
        setLoaded(true)
      })
      window.fluxAPI.libraryGetRecent().then((files) => lib.setRecentFiles(files))
    }
  }, [])

  const addFolder = async () => {
    const folder = await window.fluxAPI.openFolderDialog()
    if (!folder) return
    lib.setIsScanning(true)
    lib.setScanProgress({ processed: 0, total: 0 })
    await window.fluxAPI.libraryScanFolder(folder)
    const items = await window.fluxAPI.libraryGetAll()
    lib.setItems(items)
    lib.setIsScanning(false)
  }

  const filteredItems = lib.items.filter((item) => {
    const matchSearch = !lib.searchQuery ||
      item.title.toLowerCase().includes(lib.searchQuery.toLowerCase()) ||
      (item.artist?.toLowerCase().includes(lib.searchQuery.toLowerCase()) ?? false)
    const matchType = lib.filterType === 'all' || item.type === lib.filterType
    return matchSearch && matchType
  })

  const sortedItems = [...filteredItems].sort((a, b) => {
    const dir = lib.sortDir === 'asc' ? 1 : -1
    switch (lib.sortBy) {
      case 'title': return a.title.localeCompare(b.title) * dir
      case 'duration': return ((a.duration ?? 0) - (b.duration ?? 0)) * dir
      case 'watchedAt': return ((a.watchedAt ?? 0) - (b.watchedAt ?? 0)) * dir
      default: return ((a.addedAt ?? 0) - (b.addedAt ?? 0)) * dir
    }
  })

  return (
    <div className="flex flex-col h-full text-white">
      <div className="panel-header">
        <span className="panel-title">Library</span>
        <div className="flex items-center gap-1">
          {lib.isScanning && <Loader2 size={13} className="animate-spin text-purple-400" />}
          <button
            onClick={() => lib.setViewMode(lib.viewMode === 'grid' ? 'list' : 'grid')}
            className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white"
          >
            {lib.viewMode === 'grid' ? <List size={13} /> : <Grid size={13} />}
          </button>
          <button
            onClick={addFolder}
            className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white"
            title="Add folder"
          >
            <FolderOpen size={13} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.05] rounded-lg">
          <Search size={12} className="text-white/30 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search library…"
            value={lib.searchQuery}
            onChange={(e) => lib.setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-white/70 placeholder-white/25 outline-none"
          />
        </div>
        {/* Filter tabs */}
        <div className="flex gap-1 mt-2">
          {(['all', 'video', 'audio'] as const).map((f) => (
            <button
              key={f}
              onClick={() => lib.setFilterType(f)}
              className={cn(
                'flex-1 py-1 rounded text-[10px] font-medium capitalize transition-all',
                lib.filterType === f
                  ? 'bg-purple-600/20 text-purple-300'
                  : 'text-white/30 hover:text-white hover:bg-white/10'
              )}
            >
              {f === 'video' ? '🎬' : f === 'audio' ? '🎵' : '📁'} {f}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {!loaded ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-white/20" />
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12 px-4">
            <Film size={28} className="text-white/20" />
            <p className="text-sm text-white/30 text-center">
              No media in library yet.<br/>Add a folder to scan.
            </p>
            <button onClick={addFolder} className="btn-primary text-xs px-4 py-2">
              Add Folder
            </button>
          </div>
        ) : lib.viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-2 p-3">
            {sortedItems.map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {sortedItems.map((item) => (
              <MediaCard key={item.id} item={item} listMode />
            ))}
          </div>
        )}
      </div>

      {/* Scan progress */}
      {lib.isScanning && (
        <div className="px-3 py-2 border-t border-white/[0.06]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-white/40">Scanning…</span>
            <span className="text-[10px] text-white/40 font-mono">
              {lib.scanProgress.processed}/{lib.scanProgress.total}
            </span>
          </div>
          <div className="h-1 bg-white/10 rounded-full">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-300"
              style={{
                width: lib.scanProgress.total > 0
                  ? `${(lib.scanProgress.processed / lib.scanProgress.total) * 100}%`
                  : '0%'
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
