import { create } from 'zustand'
import type { MediaItem, RecentFile, PlaylistItem } from '@shared/types'

interface LibraryStore {
  items: MediaItem[]
  recentFiles: RecentFile[]
  playlist: PlaylistItem[]
  currentPlaylistIndex: number
  isScanning: boolean
  scanProgress: { processed: number; total: number }
  searchQuery: string
  filterType: 'all' | 'video' | 'audio'
  sortBy: 'addedAt' | 'title' | 'duration' | 'watchedAt'
  sortDir: 'asc' | 'desc'
  viewMode: 'grid' | 'list'

  // Actions
  setItems: (items: MediaItem[]) => void
  addItem: (item: MediaItem) => void
  removeItem: (filePath: string) => void
  setRecentFiles: (files: RecentFile[]) => void
  setPlaylist: (items: PlaylistItem[]) => void
  addToPlaylist: (item: PlaylistItem) => void
  removeFromPlaylist: (id: string) => void
  clearPlaylist: () => void
  setCurrentPlaylistIndex: (idx: number) => void
  movePlaylistItem: (from: number, to: number) => void
  setIsScanning: (scanning: boolean) => void
  setScanProgress: (progress: { processed: number; total: number }) => void
  setSearchQuery: (q: string) => void
  setFilterType: (type: 'all' | 'video' | 'audio') => void
  setSortBy: (sort: LibraryStore['sortBy']) => void
  setSortDir: (dir: 'asc' | 'desc') => void
  setViewMode: (mode: 'grid' | 'list') => void
  updateItemProgress: (filePath: string, percent: number) => void
}

export const useLibraryStore = create<LibraryStore>((set) => ({
  items: [],
  recentFiles: [],
  playlist: [],
  currentPlaylistIndex: -1,
  isScanning: false,
  scanProgress: { processed: 0, total: 0 },
  searchQuery: '',
  filterType: 'all',
  sortBy: 'addedAt',
  sortDir: 'desc',
  viewMode: 'grid',

  setItems: (items) => set({ items }),
  addItem: (item) => set((s) => ({ items: [item, ...s.items.filter((i) => i.filePath !== item.filePath)] })),
  removeItem: (filePath) => set((s) => ({ items: s.items.filter((i) => i.filePath !== filePath) })),
  setRecentFiles: (recentFiles) => set({ recentFiles }),
  setPlaylist: (playlist) => set({ playlist }),
  addToPlaylist: (item) => set((s) => ({ playlist: [...s.playlist, item] })),
  removeFromPlaylist: (id) => set((s) => ({ playlist: s.playlist.filter((i) => i.id !== id) })),
  clearPlaylist: () => set({ playlist: [], currentPlaylistIndex: -1 }),
  setCurrentPlaylistIndex: (currentPlaylistIndex) => set({ currentPlaylistIndex }),
  movePlaylistItem: (from, to) =>
    set((s) => {
      const newList = [...s.playlist]
      const [item] = newList.splice(from, 1)
      newList.splice(to, 0, item)
      return { playlist: newList }
    }),
  setIsScanning: (isScanning) => set({ isScanning }),
  setScanProgress: (scanProgress) => set({ scanProgress }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilterType: (filterType) => set({ filterType }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortDir: (sortDir) => set({ sortDir }),
  setViewMode: (viewMode) => set({ viewMode }),
  updateItemProgress: (filePath, percent) =>
    set((s) => ({
      items: s.items.map((i) => (i.filePath === filePath ? { ...i, watchedPercent: percent } : i)),
    })),
}))
