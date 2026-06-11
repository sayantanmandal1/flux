/**
 * PlayerEngineContext — unified player API that routes to either:
 *   - HTML5 <video>/<audio> element  (MP4, WebM, OGG, MP3, WAV, FLAC, etc.)
 *   - mpv via IPC                    (MKV, AVI, WMV, AC3, DTS, and everything else)
 *
 * This is why you don't need a separate app for common formats — Chromium (inside
 * Electron) already has these codecs built in, exactly like Chrome/Edge.
 */
import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'
import { usePlayerStore } from '@renderer/stores/player.store'
import { useUIStore } from '@renderer/stores/ui.store'
import { basename } from '@renderer/lib/utils'
import { HTML5_ALL_EXTS } from '@renderer/lib/mediaFormats'

function pathToFileUrl(p: string): string {
  // Convert Windows path C:\foo\bar.mp4 → file:///C:/foo/bar.mp4
  return `file:///${p.replace(/\\/g, '/')}`
}

// ─── Types ────────────────────────────────────────────────────────────────────
export type PlayerMode = 'html5' | 'mpv' | 'idle'

export interface PlayerEngine {
  videoRef: React.RefObject<HTMLVideoElement | null>
  mode: PlayerMode
  loadFile(path: string): Promise<void>
  loadUrl(url: string): Promise<void>
  playPause(): void
  stop(): void
  seek(pos: number): void
  seekRelative(delta: number): void
  setVolume(vol: number): void
  setMuted(muted: boolean): void
  setSpeed(speed: number): void
  takeScreenshot(): Promise<void>
}

// ─── Context ──────────────────────────────────────────────────────────────────
// Exported so usePlayerEngine.ts can access it (Fast Refresh requires hooks and
// components to be in separate files)
export const Ctx = createContext<PlayerEngine | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────
export function PlayerEngineProvider({ children }: { children: React.ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [mode, setMode] = useState<PlayerMode>('idle')
  const player = usePlayerStore()
  const ui = useUIStore()

  // ── Attach HTML5 video element events to player store ──────────────────────
  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const onTimeUpdate = () => player.setPosition(v.currentTime)
    const onDuration = () => player.setDuration(isFinite(v.duration) ? v.duration : 0)
    const onPlay = () => player.setPlaying(true)
    const onPause = () => player.setPlaying(false)
    const onWaiting = () => player.setBuffering(true)
    const onCanPlay = () => player.setBuffering(false)
    const onEnded = () => {
      player.setPlaying(false)
      ui.addNotification('Playback ended', 'info', 1500)
    }
    const onLoadedMetadata = () => {
      player.setIdle(false)
      player.setBuffering(false)
      player.setDuration(isFinite(v.duration) ? v.duration : 0)
      if (v.videoWidth > 0 && v.videoHeight > 0) {
        player.setVideoParams({
          codec: 'HTML5',
          w: v.videoWidth,
          h: v.videoHeight,
          aspect: v.videoWidth / v.videoHeight,
          fps: 0,
        })
      }
    }
    const onVolumeChange = () => {
      player.setVolume(Math.round(v.volume * 100))
      player.setMuted(v.muted)
    }
    const onRateChange = () => player.setSpeed(v.playbackRate)
    const onError = () => {
      const err = v.error
      const msg = err ? `Playback error: ${err.message || 'unknown'}` : 'Playback error'
      ui.addNotification(msg + ' — Try dragging an MKV or AVI for mpv playback', 'error', 6000)
      player.setIdle(true)
      player.setPlaying(false)
      setMode('idle')
    }

    v.addEventListener('timeupdate', onTimeUpdate)
    v.addEventListener('durationchange', onDuration)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('waiting', onWaiting)
    v.addEventListener('canplay', onCanPlay)
    v.addEventListener('ended', onEnded)
    v.addEventListener('loadedmetadata', onLoadedMetadata)
    v.addEventListener('volumechange', onVolumeChange)
    v.addEventListener('ratechange', onRateChange)
    v.addEventListener('error', onError)

    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate)
      v.removeEventListener('durationchange', onDuration)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('waiting', onWaiting)
      v.removeEventListener('canplay', onCanPlay)
      v.removeEventListener('ended', onEnded)
      v.removeEventListener('loadedmetadata', onLoadedMetadata)
      v.removeEventListener('volumechange', onVolumeChange)
      v.removeEventListener('ratechange', onRateChange)
      v.removeEventListener('error', onError)
    }
  }, [])

  // ── Engine actions ─────────────────────────────────────────────────────────

  const loadFile = useCallback(async (path: string) => {
    const title = basename(path)

    // Route ALL local files through mpv — it handles every format via FFmpeg.
    // HTML5 <video> had file:// URL security issues in Electron and is not needed
    // since mpv plays MP4/WebM/MP3/FLAC with identical quality.
    setMode('mpv')
    player.setFilePath(path)
    player.setUrl(null)
    player.setMediaTitle(title)
    // Stop any HTML5 playback
    const v = videoRef.current
    if (v) { v.pause(); v.src = '' }
    // Native video window will be shown by the fileLoaded event in the main process
    window.fluxAPI.hideMpvView()
    await window.fluxAPI.loadFile(path)
  }, [])

  const loadUrl = useCallback(async (url: string) => {
    // URLs always go to mpv (yt-dlp, HLS, RTSP, etc.)
    setMode('mpv')
    player.setUrl(url)
    player.setFilePath(null)
    // Stop HTML5 if playing
    const v = videoRef.current
    if (v) { v.pause(); v.src = '' }
    // mpv view shown by fileLoaded event
    await window.fluxAPI.loadUrl(url)
  }, [])

  const playPause = useCallback(() => {
    window.fluxAPI.playPause().catch(() => {})
  }, [])

  const stop = useCallback(() => {
    window.fluxAPI.stop().catch(() => {})
  }, [])

  const seek = useCallback((pos: number) => {
    window.fluxAPI.seek(pos).catch(() => {})
  }, [])

  const seekRelative = useCallback((delta: number) => {
    window.fluxAPI.seekRelative(delta).catch(() => {})
  }, [])

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(200, vol))
    player.setVolume(clamped)
    window.fluxAPI.setVolume(clamped).catch(() => {})
  }, [])

  const setMuted = useCallback((muted: boolean) => {
    player.setMuted(muted)
    window.fluxAPI.setMuted(muted).catch(() => {})
  }, [])

  const setSpeed = useCallback((speed: number) => {
    player.setSpeed(speed)
    window.fluxAPI.setSpeed(speed).catch(() => {})
  }, [])

  const takeScreenshot = useCallback(async () => {
    await window.fluxAPI.takeScreenshot()
    ui.addNotification('Screenshot saved', 'success')
  }, [])

  const engine: PlayerEngine = {
    videoRef,
    mode,
    loadFile,
    loadUrl,
    playPause,
    stop,
    seek,
    seekRelative,
    setVolume,
    setMuted,
    setSpeed,
    takeScreenshot,
  }

  return <Ctx.Provider value={engine}>{children}</Ctx.Provider>
}
