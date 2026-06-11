import { useEffect, useCallback } from 'react'
import { usePlayerStore } from '@renderer/stores/player.store'
import { useUIStore } from '@renderer/stores/ui.store'
import { useLibraryStore } from '@renderer/stores/library.store'
import { usePlayerEngine } from '@renderer/contexts/usePlayerEngine'
import { IPC } from '@shared/types'
import type { MediaTrack, Chapter } from '@shared/types'

/**
 * Core hook that bridges the Electron IPC events to Zustand store updates.
 * Also provides high-level player control functions.
 */
export function usePlayer() {
  const player = usePlayerStore()
  const ui = useUIStore()
  const library = useLibraryStore()
  const engine = usePlayerEngine()

  // ── IPC event listeners ─────────────────────────────────────────────────

  useEffect(() => {
    const api = window.fluxAPI

    // Position updates (high frequency — handled separately for performance)
    const onPosition = (pos: number) => {
      player.setPosition(pos)
    }

    // State batch updates
    const onStateUpdate = (update: Record<string, unknown>) => {
      player.applyStateUpdate(update as Parameters<typeof player.applyStateUpdate>[0])
      if ('isPlaying' in update) player.setPlaying(update.isPlaying as boolean)
      if ('isIdle' in update) player.setIdle(update.isIdle as boolean)
      if ('isBuffering' in update) player.setBuffering(update.isBuffering as boolean)
      if ('duration' in update) player.setDuration(update.duration as number)
      if ('volume' in update) player.setVolume(update.volume as number)
      if ('muted' in update) player.setMuted(update.muted as boolean)
      if ('speed' in update) player.setSpeed(update.speed as number)
      if ('mediaTitle' in update) player.setMediaTitle(update.mediaTitle as string)
      if ('videoParams' in update) player.setVideoParams(update.videoParams as Parameters<typeof player.setVideoParams>[0])
      if ('audioParams' in update) player.setAudioParams(update.audioParams as Parameters<typeof player.setAudioParams>[0])
      if ('hwdecActive' in update) player.setHwdecActive(update.hwdecActive as boolean)
    }

    const onTracksChanged = (tracks: MediaTrack[]) => {
      player.setTracks(tracks)
    }

    const onChaptersChanged = (chapters: Chapter[]) => {
      player.setChapters(chapters)
    }

    const onFileLoaded = () => {
      ui.setLoading(false)
      ui.setAbLoopMode('none')
      player.setAbLoopA(null)
      player.setAbLoopB(null)
    }

    const onEof = () => {
      player.setPlaying(false)
      // Auto-advance playlist
      const playlist = library.playlist
      const idx = library.currentPlaylistIndex
      if (idx >= 0 && idx < playlist.length - 1) {
        const nextItem = playlist[idx + 1]
        library.setCurrentPlaylistIndex(idx + 1)
        if (nextItem.filePath) api.loadFile(nextItem.filePath).catch(() => {})
        else if (nextItem.url) api.loadUrl(nextItem.url).catch(() => {})
      }
    }

    const onMpvError = (msg: string) => {
      ui.addNotification(msg, 'error', 5000)
    }

    const onUpdateAvailable = (info: { version: string }) => {
      ui.setUpdateInfo({ version: info.version, downloaded: false })
    }

    const onUpdateProgress = (info: { percent: number }) => {
      ui.setUpdateInfo((prev) => prev ? { ...prev, progress: info.percent } : null)
    }

    const onUpdateDownloaded = (info: { version: string }) => {
      ui.setUpdateInfo({ version: info.version, downloaded: true })
    }

    // Taskbar button events
    const onTaskbarPlayPause = () => api.playPause().catch(() => {})
    const onTaskbarNext = () => api.loadNext().catch(() => {})
    const onTaskbarPrev = () => api.loadPrev().catch(() => {})

    api.on(IPC.POSITION_UPDATE, onPosition)
    api.on(IPC.STATE_UPDATE, onStateUpdate)
    api.on(IPC.TRACKS_CHANGED, onTracksChanged)
    api.on(IPC.CHAPTERS_CHANGED, onChaptersChanged)
    api.on(IPC.FILE_LOADED, onFileLoaded)
    api.on(IPC.EOF, onEof)
    api.on(IPC.MPV_ERROR, onMpvError)
    api.on(IPC.UPDATE_AVAILABLE, onUpdateAvailable)
    api.on(IPC.UPDATE_PROGRESS, onUpdateProgress)
    api.on(IPC.UPDATE_DOWNLOADED, onUpdateDownloaded)
    api.on('taskbar:play-pause', onTaskbarPlayPause)
    api.on('taskbar:next', onTaskbarNext)
    api.on('taskbar:prev', onTaskbarPrev)

    return () => {
      api.off(IPC.POSITION_UPDATE, onPosition)
      api.off(IPC.STATE_UPDATE, onStateUpdate)
      api.off(IPC.TRACKS_CHANGED, onTracksChanged)
      api.off(IPC.CHAPTERS_CHANGED, onChaptersChanged)
      api.off(IPC.FILE_LOADED, onFileLoaded)
      api.off(IPC.EOF, onEof)
      api.off(IPC.MPV_ERROR, onMpvError)
      api.off(IPC.UPDATE_AVAILABLE, onUpdateAvailable)
      api.off(IPC.UPDATE_PROGRESS, onUpdateProgress)
      api.off(IPC.UPDATE_DOWNLOADED, onUpdateDownloaded)
      api.off('taskbar:play-pause', onTaskbarPlayPause)
      api.off('taskbar:next', onTaskbarNext)
      api.off('taskbar:prev', onTaskbarPrev)
    }
  }, [])

  // ── Drag & Drop ─────────────────────────────────────────────────────────

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length > 0) {
        const paths = files.map((f) => f.path).filter(Boolean)
        if (paths.length > 0) {
          // Use engine — routes to HTML5 or mpv based on format
          await engine.loadFile(paths[0])
          if (paths.length > 1) {
            for (let i = 1; i < paths.length; i++) {
              library.addToPlaylist({ id: paths[i], filePath: paths[i], title: paths[i].split(/[\\/]/).pop() || paths[i] })
            }
          }
        }
      }
    }

    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)
    return () => {
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
    }
  }, [])

  // ── Control actions ─────────────────────────────────────────────────────

  const openFile = useCallback(async () => {
    const files = await window.fluxAPI.openFileDialog()
    if (files && files.length > 0) {
      await window.fluxAPI.loadFile(files[0])
      player.setFilePath(files[0])
      ui.setLoading(true)
      if (files.length > 1) {
        for (let i = 1; i < files.length; i++) {
          library.addToPlaylist({
            id: files[i],
            filePath: files[i],
            title: files[i].split(/[\\/]/).pop() || files[i],
          })
        }
      }
    }
  }, [])

  const openUrl = useCallback(async (url: string) => {
    await window.fluxAPI.loadUrl(url)
    player.setUrl(url)
    ui.setLoading(true)
    ui.closeModal()
  }, [])

  const playPause = useCallback(() => window.fluxAPI.playPause(), [])
  const seek = useCallback((pos: number) => window.fluxAPI.seek(pos), [])
  const seekRelative = useCallback((delta: number) => window.fluxAPI.seekRelative(delta), [])
  const setVolume = useCallback((vol: number) => window.fluxAPI.setVolume(vol), [])
  const toggleMute = useCallback(() => window.fluxAPI.setMuted(!player.muted), [player.muted])
  const setSpeed = useCallback((speed: number) => window.fluxAPI.setSpeed(speed), [])

  const toggleFullscreen = useCallback(async () => {
    const next = !player.isFullscreen
    await window.fluxAPI.setFullscreen(next)
    player.setFullscreen(next)
  }, [player.isFullscreen])

  const setAbLoopA = useCallback(async () => {
    await window.fluxAPI.setAbLoopA(player.position)
    player.setAbLoopA(player.position)
    ui.setAbLoopMode('a-set')
  }, [player.position])

  const setAbLoopB = useCallback(async () => {
    if (ui.abLoopMode !== 'a-set') return
    await window.fluxAPI.setAbLoopB(player.position)
    player.setAbLoopB(player.position)
    ui.setAbLoopMode('ab-set')
  }, [player.position, ui.abLoopMode])

  const clearAbLoop = useCallback(async () => {
    await window.fluxAPI.clearAbLoop()
    player.setAbLoopA(null)
    player.setAbLoopB(null)
    ui.setAbLoopMode('none')
  }, [])

  const takeScreenshot = useCallback(async () => {
    await engine.takeScreenshot()
  }, [engine])

  return {
    player,
    openFile,
    openUrl,
    playPause,
    seek,
    seekRelative,
    setVolume,
    toggleMute,
    setSpeed,
    toggleFullscreen,
    setAbLoopA,
    setAbLoopB,
    clearAbLoop,
    takeScreenshot,
  }
}
