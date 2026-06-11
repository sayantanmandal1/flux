import { useEffect } from 'react'
import { usePlayer } from '@renderer/hooks/usePlayer'
import { useKeyboard } from '@renderer/hooks/useKeyboard'
import { useSettingsStore } from '@renderer/stores/settings.store'
import { usePlayerStore } from '@renderer/stores/player.store'
import { useUIStore } from '@renderer/stores/ui.store'
import { PlayerEngineProvider } from '@renderer/contexts/PlayerEngineContext'
import { TitleBar } from '@renderer/components/Player/TitleBar'
import { VideoContainer } from '@renderer/components/Player/VideoContainer'
import { Controls } from '@renderer/components/Player/Controls'
import { ContextMenu } from '@renderer/components/Player/ContextMenu'
import { Sidebar } from '@renderer/components/UI/Sidebar'
import { HomeScreen } from '@renderer/components/UI/HomeScreen'
import { PlaylistPanel } from '@renderer/components/Panels/PlaylistPanel'
import { EqualizerPanel } from '@renderer/components/Panels/EqualizerPanel'
import { SubtitlePanel } from '@renderer/components/Panels/SubtitlePanel'
import { VideoFiltersPanel } from '@renderer/components/Panels/VideoFiltersPanel'
import { ChaptersPanel } from '@renderer/components/Panels/ChaptersPanel'
import { MediaInfoPanel } from '@renderer/components/Panels/MediaInfoPanel'
import { MediaLibrary } from '@renderer/components/Library/MediaLibrary'
import { SettingsModal } from '@renderer/components/Settings/SettingsModal'
import { OpenUrlDialog } from '@renderer/components/UI/OpenUrlDialog'
import { UpdateNotification } from '@renderer/components/UI/UpdateNotification'
import { SubtitleSearchDialog } from '@renderer/components/UI/SubtitleSearchDialog'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@renderer/lib/utils'

export default function App() {
  return (
    <PlayerEngineProvider>
      <AppInner />
    </PlayerEngineProvider>
  )
}

function AppInner() {
  const { openFile } = usePlayer()
  useKeyboard()

  const settingsStore = useSettingsStore()
  const player = usePlayerStore()
  const ui = useUIStore()

  // Load settings in background — does NOT block the initial render.
  // electron-store reads from disk synchronously in main process; the IPC
  // roundtrip takes ~1ms. No spinner needed.
  useEffect(() => {
    settingsStore.loadSettings().catch(() => {})
  }, [])

  const showPlayer = !player.isIdle

  const renderPanel = () => {
    switch (ui.activePanel) {
      case 'playlist':    return <PlaylistPanel />
      case 'equalizer':   return <EqualizerPanel />
      case 'subtitles':   return <SubtitlePanel />
      case 'filters':     return <VideoFiltersPanel />
      case 'chapters':    return <ChaptersPanel />
      case 'mediaInfo':   return <MediaInfoPanel />
      case 'library':     return <MediaLibrary />
      default:            return null
    }
  }

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden select-none"
      style={{ background: 'transparent' }}>
      {/* Custom title bar */}
      <TitleBar />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Left sidebar (nav) */}
        <AnimatePresence>
          {ui.showSidebar && (
            <motion.div
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="z-30"
            >
              <Sidebar />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video area + controls */}
        <div className={cn('flex-1 flex flex-col overflow-hidden', 'transition-all duration-300')}>

          {/* Video surface — transparent so native WS_CHILD window shows through */}
          <div className="flex-1 relative overflow-hidden" style={{ background: 'transparent' }}>
            <VideoContainer />

            {/* Home screen — shown when idle, hidden when playing */}
            <AnimatePresence>
              {player.isIdle && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10"
                >
                  <HomeScreen onOpenFile={openFile} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls bar — BELOW the video surface, never covered by mpv child window */}
          <AnimatePresence>
            {(!player.isIdle || showPlayer) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="flex-shrink-0 bg-black/95 border-t border-white/[0.06]"
                onMouseEnter={() => ui.showControlsNow()}
              >
                <Controls />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right panel */}
        <AnimatePresence>
          {ui.activePanel && (
            <motion.div
              key={ui.activePanel}
              initial={{ x: 340, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 340, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-80 border-l border-white/[0.06] bg-[#0a0a0a] z-20 flex-shrink-0 overflow-hidden"
            >
              {renderPanel()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Context menu */}
      <ContextMenu />

      {/* Modals */}
      <AnimatePresence>
        {ui.activeModal === 'settings' && <SettingsModal key="settings" />}
        {ui.activeModal === 'openUrl' && <OpenUrlDialog key="url" />}
        {ui.activeModal === 'subtitleSearch' && <SubtitleSearchDialog key="sub-search" />}
      </AnimatePresence>

      {/* Update notification */}
      <UpdateNotification />

      {/* Toast notifications */}
      <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {ui.notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium shadow-glass',
                'border border-white/10 backdrop-blur-xl',
                n.type === 'error' && 'bg-red-500/20 text-red-300',
                n.type === 'success' && 'bg-green-500/20 text-green-300',
                n.type === 'warning' && 'bg-yellow-500/20 text-yellow-300',
                n.type === 'info' && 'bg-white/10 text-white/80',
              )}
            >
              {n.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
