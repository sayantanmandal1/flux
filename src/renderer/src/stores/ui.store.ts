import { create } from 'zustand'

type Panel = 'playlist' | 'equalizer' | 'subtitles' | 'filters' | 'chapters' | 'mediaInfo' | 'library' | null
type Modal = 'settings' | 'openUrl' | 'subtitleSearch' | 'pip' | null

interface UIStore {
  activePanel: Panel
  activeModal: Modal
  showControls: boolean
  controlsTimeout: ReturnType<typeof setTimeout> | null
  showSidebar: boolean
  isMiniPlayer: boolean
  isLoading: boolean
  contextMenu: { x: number; y: number; open: boolean }
  notifications: Array<{ id: string; message: string; type: 'info' | 'success' | 'error' | 'warning'; timeout: number }>
  abLoopMode: 'none' | 'a-set' | 'ab-set'
  updateInfo: { version: string; progress?: number; downloaded: boolean } | null

  // Actions
  setActivePanel: (panel: Panel) => void
  togglePanel: (panel: Panel) => void
  setActiveModal: (modal: Modal) => void
  closeModal: () => void
  showControlsNow: () => void
  hideControls: () => void
  scheduleHideControls: (delay?: number) => void
  toggleSidebar: () => void
  setSidebar: (show: boolean) => void
  setMiniPlayer: (mini: boolean) => void
  setLoading: (loading: boolean) => void
  openContextMenu: (x: number, y: number) => void
  closeContextMenu: () => void
  addNotification: (message: string, type?: 'info' | 'success' | 'error' | 'warning', duration?: number) => void
  removeNotification: (id: string) => void
  setAbLoopMode: (mode: UIStore['abLoopMode']) => void
  setUpdateInfo: (info: UIStore['updateInfo']) => void
}

export const useUIStore = create<UIStore>((set, get) => ({
  activePanel: null,
  activeModal: null,
  showControls: true,
  controlsTimeout: null,
  showSidebar: false,
  isMiniPlayer: false,
  isLoading: false,
  contextMenu: { x: 0, y: 0, open: false },
  notifications: [],
  abLoopMode: 'none',
  updateInfo: null,

  setActivePanel: (activePanel) => set({ activePanel }),
  togglePanel: (panel) =>
    set((s) => ({ activePanel: s.activePanel === panel ? null : panel })),
  setActiveModal: (activeModal) => set({ activeModal }),
  closeModal: () => set({ activeModal: null }),
  showControlsNow: () => set({ showControls: true }),
  hideControls: () => set({ showControls: false }),
  scheduleHideControls: (delay = 3000) => {
    const existing = get().controlsTimeout
    if (existing) clearTimeout(existing)
    set({ showControls: true })
    const timeout = setTimeout(() => {
      set({ showControls: false, controlsTimeout: null })
    }, delay)
    set({ controlsTimeout: timeout })
  },
  toggleSidebar: () => set((s) => ({ showSidebar: !s.showSidebar })),
  setSidebar: (showSidebar) => set({ showSidebar }),
  setMiniPlayer: (isMiniPlayer) => set({ isMiniPlayer }),
  setLoading: (isLoading) => set({ isLoading }),
  openContextMenu: (x, y) => set({ contextMenu: { x, y, open: true } }),
  closeContextMenu: () => set((s) => ({ contextMenu: { ...s.contextMenu, open: false } })),
  addNotification: (message, type = 'info', duration = 3000) => {
    // Use a monotonic counter so rapid notifications never share a key
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    set((s) => ({
      notifications: [...s.notifications, { id, message, type, timeout: duration }],
    }))
    setTimeout(() => {
      get().removeNotification(id)
    }, duration)
  },
  removeNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
  setAbLoopMode: (abLoopMode) => set({ abLoopMode }),
  setUpdateInfo: (updateInfo) => set({ updateInfo }),
}))
