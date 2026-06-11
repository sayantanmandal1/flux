import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { EventEmitter } from 'events'
import { join } from 'path'
import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { MpvPipeClient } from './pipe-client'
import { EQ_BANDS } from '../../shared/constants'
import type { MediaTrack, Chapter } from '../../shared/types'

const PIPE_NAME = 'flux-mpv'
// Use String concatenation - template literals do NOT process escape sequences,
// so `\\\\.\\pipe\\` would produce wrong path. This produces: \\.\pipe\flux-mpv
const PIPE_PATH = '\\\\.\\pipe\\' + PIPE_NAME
const RECONNECT_DELAY_MS = 250
const MAX_RECONNECT_ATTEMPTS = 120

interface MpvOptions {
  binaryPath: string
  configDir: string
  hwnd?: bigint | null
}

/**
 * Core mpv subprocess manager.
 * Spawns mpv.exe with named-pipe IPC, embeds video into Electron window HWND,
 * exposes a clean async API for all playback controls.
 */
export class MpvManager extends EventEmitter {
  private opts: MpvOptions
  private process: ChildProcessWithoutNullStreams | null = null
  private pipe: MpvPipeClient
  private propObserverIds = new Map<string, number>()
  private nextObserverId = 1
  private reconnectAttempts = 0
  private crashCount = 0
  private readonly MAX_CRASH_RESTARTS = 5
  private hwnd: bigint | null = null
  private isShuttingDown = false
  private eqBands: number[] = Array(15).fill(0)
  private eqEnabled = false
  private afFilters: string[] = []
  private videoFilters: string[] = []

  constructor(opts: MpvOptions) {
    super()
    this.opts = opts
    this.pipe = new MpvPipeClient(PIPE_PATH)

    this.pipe.on('connected', () => this.onPipeConnected())
    this.pipe.on('disconnected', () => {
      if (!this.isShuttingDown) {
        this.emit('disconnected')
      }
    })
    this.pipe.on('event', (evt: Record<string, unknown>) => this.handleMpvEvent(evt))
    this.pipe.on('error', (err: Error) => {
      if (!this.isShuttingDown) {
        console.error('[MpvManager] pipe error:', err.message)
      }
    })
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  async start(hwnd?: bigint | null): Promise<void> {
    this.hwnd = hwnd ?? null
    this.isShuttingDown = false
    this.crashCount = 0
    await this.spawnMpv()
  }

  async stop(): Promise<void> {
    this.isShuttingDown = true
    this.pipe.disconnect()
    if (this.process) {
      try {
        await this.sendCommand(['quit'])
      } catch {}
      this.process.kill('SIGTERM')
      this.process = null
    }
    this.emit('stopped')
  }

  restart(): Promise<void> {
    this.pipe.disconnect()
    if (this.process) {
      this.process.kill('SIGTERM')
      this.process = null
    }
    return this.spawnMpv()
  }

  private async spawnMpv(): Promise<void> {
    const mpvBin = this.opts.binaryPath
    if (!existsSync(mpvBin)) {
      this.emit('error', new Error(`mpv binary not found at: ${mpvBin}`))
      return
    }

    const configDir = this.opts.configDir
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true })
    }

    const args = [
      '--idle=yes',
      '--no-terminal',
      '--osc=no',
      '--keep-open=yes',
      `--input-ipc-server=${PIPE_PATH}`,
      `--config-dir=${configDir}`,
      // Window settings for embedded mode
      '--ontop=no',
      '--border=no',
      '--cursor-autohide=always',
      '--osd-level=0',
      '--sub-auto=fuzzy',
      '--sub-font-size=42',
      '--blend-subtitles=no',
      '--volume-max=200',
      '--cursor-autohide=always',
      '--really-quiet',
      '--msg-level=all=warn',
    ]

    // Pass --wid ONLY if we have a valid child window HWND.
    // mpv renders directly into that window, filling it completely (like VLC).
    if (this.hwnd && this.hwnd !== 0n) {
      args.push(`--wid=${this.hwnd.toString()}`)
      console.log(`[MpvManager] Spawning mpv with --wid=${this.hwnd} (fills child window like VLC):`, mpvBin)
    } else {
      console.log('[MpvManager] Spawning mpv in idle mode (no wid):', mpvBin)
    }

    const proc = spawn(mpvBin, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    // Capture stderr to diagnose crashes
    let stderrBuf = ''
    proc.stderr?.on('data', (d: Buffer) => {
      const line = d.toString()
      stderrBuf += line
      // Log only lines that look like errors
      if (/error|fail|invalid|fatal/i.test(line)) {
        console.error('[mpv]', line.trim())
      }
    })

    proc.on('error', (err) => {
      console.error('[MpvManager] spawn error:', err)
      this.emit('error', err)
    })

    proc.on('exit', (code, signal) => {
      console.log(`[MpvManager] mpv exited: code=${code} signal=${signal}`)
      if (stderrBuf.trim()) {
        console.error('[MpvManager] Last mpv stderr:', stderrBuf.slice(-500))
      }
      stderrBuf = ''
      this.process = null
      if (!this.isShuttingDown) {
        this.crashCount++
        this.emit('crashed', { code, signal })
        if (this.crashCount <= this.MAX_CRASH_RESTARTS) {
          // Reset crash counter after a successful run window (2s) to not penalize transient crashes
          setTimeout(() => this.spawnMpv(), 1000)
        } else {
          console.error('[MpvManager] mpv exceeded max crash restarts. Giving up.')
          this.emit('error', new Error('mpv crashed too many times'))
        }
      }
    })

    this.process = proc

    // Wait briefly for pipe to become available, then connect
    await this.connectWithRetry()
  }

  private async connectWithRetry(): Promise<void> {
    this.reconnectAttempts = 0

    const attempt = async () => {
      if (this.isShuttingDown) return
      try {
        await this.pipe.connect()
      } catch (e) {
        this.reconnectAttempts++
        if (this.reconnectAttempts === 1) {
          // Log the very first error so we know what's happening
          console.log(`[MpvManager] Pipe connect error (attempt 1): ${(e as Error).message || String(e)}`)
        }
        if (this.reconnectAttempts % 8 === 0) {
          console.log(`[MpvManager] Still waiting for pipe... attempt ${this.reconnectAttempts}`)
        }
        if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          setTimeout(attempt, RECONNECT_DELAY_MS)
        } else {
          this.emit('error', new Error('Failed to connect to mpv IPC pipe after max attempts'))
        }
      }
    }

    // Give mpv time to start and create the pipe (500ms generous wait)
    setTimeout(attempt, 500)
  }

  private async onPipeConnected(): Promise<void> {
    this.reconnectAttempts = 0
    this.crashCount = 0   // reset: successful connection means mpv is healthy
    console.log('[MpvManager] Connected to mpv IPC pipe')
    this.emit('ready')

    // Register property observers
    await this.observeProperties()
  }

  private async observeProperties(): Promise<void> {
    const props = [
      'time-pos',
      'duration',
      'pause',
      'idle-active',
      'core-idle',
      'volume',
      'mute',
      'speed',
      'media-title',
      'filename',
      'path',
      'file-format',
      'track-list',
      'chapter-list',
      'chapter',
      'video-params',
      'audio-params',
      'hwdec-current',
      'video-out-params',
      'eof-reached',
      'seeking',
      'demuxer-cache-state',
    ]

    for (const prop of props) {
      const id = this.nextObserverId++
      this.propObserverIds.set(prop, id)
      try {
        await this.sendCommand(['observe_property', id, prop])
      } catch {
        // Non-fatal if a property isn't available
      }
    }
  }

  // ─── mpv Event Handler ────────────────────────────────────────────────────

  private handleMpvEvent(evt: Record<string, unknown>): void {
    const event = evt.event as string

    switch (event) {
      case 'property-change': {
        const name = evt.name as string
        const data = evt.data

        switch (name) {
          case 'time-pos':
            this.emit('timePos', typeof data === 'number' ? data : 0)
            break
          case 'duration':
            this.emit('duration', typeof data === 'number' ? data : 0)
            break
          case 'pause':
            this.emit('pause', data === true)
            break
          case 'idle-active':
          case 'core-idle':
            if (name === 'idle-active') this.emit('idle', data === true)
            break
          case 'volume':
            this.emit('volume', typeof data === 'number' ? data : 100)
            break
          case 'mute':
            this.emit('muted', data === true)
            break
          case 'speed':
            this.emit('speed', typeof data === 'number' ? data : 1)
            break
          case 'media-title':
            this.emit('mediaTitle', data ?? '')
            break
          case 'track-list':
            this.emit('trackList', this.parseTrackList(data))
            break
          case 'chapter-list':
            this.emit('chapterList', this.parseChapterList(data))
            break
          case 'chapter':
            this.emit('chapter', typeof data === 'number' ? data : -1)
            break
          case 'video-params':
          case 'video-out-params':
            this.emit('videoParams', data)
            break
          case 'audio-params':
            this.emit('audioParams', data)
            break
          case 'hwdec-current':
            this.emit('hwdec', data)
            break
          case 'seeking':
            this.emit('seeking', data === true)
            break
          case 'demuxer-cache-state':
            this.emit('bufferingState', data)
            break
          case 'eof-reached':
            if (data === true) this.emit('eof')
            break
        }
        break
      }

      case 'file-loaded':
        this.emit('fileLoaded')
        break
      case 'end-file':
        this.emit('endFile', evt.reason)
        break
      case 'start-file':
        this.emit('startFile')
        break
      case 'seek':
        this.emit('seeked')
        break
      case 'playback-restart':
        this.emit('playbackRestart')
        break
      case 'idle':
        this.emit('idleEvent')
        break
      case 'shutdown':
        this.emit('shutdown')
        break
    }
  }

  // ─── Core Command Helpers ─────────────────────────────────────────────────

  async sendCommand(cmd: unknown[]): Promise<unknown> {
    if (!this.pipe.connected) {
      throw new Error('mpv not connected')
    }
    return this.pipe.send(cmd)
  }

  private async setProperty(prop: string, value: unknown): Promise<void> {
    await this.sendCommand(['set_property', prop, value])
  }

  async getProperty(prop: string): Promise<unknown> {
    return this.sendCommand(['get_property', prop])
  }

  // ─── Playback Control ─────────────────────────────────────────────────────

  async loadFile(filePath: string, append = false): Promise<void> {
    const mode = append ? 'append-play' : 'replace'
    await this.sendCommand(['loadfile', filePath, mode])
  }

  async loadUrl(url: string, ytdlpBin?: string): Promise<void> {
    if (ytdlpBin && existsSync(ytdlpBin)) {
      // Use yt-dlp to resolve streaming URL
      const resolvedUrl = await this.resolveStreamingUrl(url, ytdlpBin)
      await this.sendCommand(['loadfile', resolvedUrl, 'replace'])
    } else {
      // Pass directly to mpv (it handles many streaming protocols natively)
      await this.sendCommand(['loadfile', url, 'replace'])
    }
  }

  private resolveStreamingUrl(url: string, ytdlpBin: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        '--get-url',
        '--format', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best',
        '--no-playlist',
        '--quiet',
        url,
      ]
      const proc = spawn(ytdlpBin, args)
      let stdout = ''
      let stderr = ''
      proc.stdout.on('data', (d) => (stdout += d.toString()))
      proc.stderr.on('data', (d) => (stderr += d.toString()))
      proc.on('close', (code) => {
        if (code === 0 && stdout.trim()) {
          resolve(stdout.trim().split('\n')[0])
        } else {
          // Fallback: let mpv handle it with yt-dlp hook internally
          resolve(url)
        }
      })
      proc.on('error', () => resolve(url))
    })
  }

  async play(): Promise<void> {
    await this.setProperty('pause', false)
  }

  async pause(): Promise<void> {
    await this.setProperty('pause', true)
  }

  async togglePause(): Promise<void> {
    await this.sendCommand(['cycle', 'pause'])
  }

  async stopMedia(): Promise<void> {
    await this.sendCommand(['stop'])
  }

  async seek(pos: number, type: 'absolute' | 'relative' | 'absolute-percent' = 'absolute'): Promise<void> {
    await this.sendCommand(['seek', pos, type, 'exact'])
  }

  async frameStep(): Promise<void> {
    await this.sendCommand(['frame-step'])
  }

  async frameBackStep(): Promise<void> {
    await this.sendCommand(['frame-back-step'])
  }

  // ─── Volume ───────────────────────────────────────────────────────────────

  async setVolume(volume: number): Promise<void> {
    await this.setProperty('volume', Math.max(0, Math.min(200, volume)))
  }

  async setMuted(muted: boolean): Promise<void> {
    await this.setProperty('mute', muted)
  }

  async toggleMute(): Promise<void> {
    await this.sendCommand(['cycle', 'mute'])
  }

  // ─── Speed ────────────────────────────────────────────────────────────────

  async setSpeed(speed: number): Promise<void> {
    await this.setProperty('speed', Math.max(0.01, Math.min(100, speed)))
  }

  // ─── Tracks ──────────────────────────────────────────────────────────────

  async setAudioTrack(id: number): Promise<void> {
    await this.setProperty('aid', id)
  }

  async setSubTrack(id: number | boolean): Promise<void> {
    await this.setProperty('sid', id)
  }

  async setVideoTrack(id: number): Promise<void> {
    await this.setProperty('vid', id)
  }

  async cycleAudioTrack(): Promise<void> {
    await this.sendCommand(['cycle', 'audio'])
  }

  async cycleSubTrack(): Promise<void> {
    await this.sendCommand(['cycle', 'sub'])
  }

  async addSubtitleFile(filePath: string): Promise<void> {
    await this.sendCommand(['sub-add', filePath, 'select'])
  }

  // ─── Delays ──────────────────────────────────────────────────────────────

  async setAudioDelay(delay: number): Promise<void> {
    await this.setProperty('audio-delay', delay)
  }

  async setSubDelay(delay: number): Promise<void> {
    await this.setProperty('sub-delay', delay)
  }

  // ─── Aspect & Display ────────────────────────────────────────────────────

  async setAspect(aspect: string): Promise<void> {
    await this.setProperty('video-aspect-override', aspect || '-1')
  }

  async setFullscreen(fs: boolean): Promise<void> {
    await this.setProperty('fullscreen', fs)
  }

  // ─── Chapters ────────────────────────────────────────────────────────────

  async nextChapter(): Promise<void> {
    await this.sendCommand(['add', 'chapter', 1])
  }

  async prevChapter(): Promise<void> {
    await this.sendCommand(['add', 'chapter', -1])
  }

  async seekChapter(index: number): Promise<void> {
    await this.setProperty('chapter', index)
  }

  // ─── A-B Loop ────────────────────────────────────────────────────────────

  async setAbLoopA(time: number): Promise<void> {
    await this.setProperty('ab-loop-a', time)
  }

  async setAbLoopB(time: number): Promise<void> {
    await this.setProperty('ab-loop-b', time)
  }

  async clearAbLoop(): Promise<void> {
    await this.setProperty('ab-loop-a', 'no')
    await this.setProperty('ab-loop-b', 'no')
  }

  // ─── Screenshot ──────────────────────────────────────────────────────────

  async takeScreenshot(dir: string, format: 'png' | 'jpg' | 'webp' = 'png'): Promise<void> {
    await this.setProperty('screenshot-directory', dir)
    await this.setProperty('screenshot-format', format)
    await this.sendCommand(['screenshot', 'video'])
  }

  // ─── Equalizer ───────────────────────────────────────────────────────────

  async setEqualizer(bands: number[], enabled = true): Promise<void> {
    this.eqBands = [...bands]
    this.eqEnabled = enabled

    // Remove existing EQ from filter chain
    this.afFilters = this.afFilters.filter((f) => !f.startsWith('equalizer='))

    if (enabled) {
      // Build mpv equalizer string: equalizer=f1:g1:f2:g2:...
      // mpv's equalizer filter takes pairs of freq:gain
      const eqStr = EQ_BANDS.map((freq, i) => `${freq}:${bands[i] ?? 0}`).join(':')
      this.afFilters.push(`equalizer=${eqStr}`)
    }

    await this.applyAudioFilters()
  }

  async setEqualizerEnabled(enabled: boolean): Promise<void> {
    await this.setEqualizer(this.eqBands, enabled)
  }

  private async applyAudioFilters(): Promise<void> {
    const filterStr = this.afFilters.length > 0 ? this.afFilters.join(',') : ''
    try {
      await this.setProperty('af', filterStr || 'no')
    } catch {
      // If setting to 'no' fails, just clear
      await this.sendCommand(['af', 'clr', ''])
    }
  }

  // ─── Audio Normalize ─────────────────────────────────────────────────────

  async setAudioNormalize(enabled: boolean): Promise<void> {
    this.afFilters = this.afFilters.filter((f) => !f.startsWith('dynaudnorm'))
    if (enabled) {
      this.afFilters.push('dynaudnorm=f=200:g=3:p=0.95')
    }
    await this.applyAudioFilters()
  }

  // ─── Video Filters ───────────────────────────────────────────────────────

  async setVideoFilter(name: string, params?: string): Promise<void> {
    // Remove existing filter of same type
    this.videoFilters = this.videoFilters.filter((f) => !f.startsWith(name))

    if (params !== undefined && params !== '' && params !== '0') {
      this.videoFilters.push(params ? `${name}=${params}` : name)
    }

    await this.applyVideoFilters()
  }

  private async applyVideoFilters(): Promise<void> {
    const filterStr = this.videoFilters.join(',')
    try {
      await this.setProperty('vf', filterStr || 'no')
    } catch {
      await this.sendCommand(['vf', 'clr', ''])
    }
  }

  // ─── Color Adjustments ───────────────────────────────────────────────────

  async setBrightness(val: number): Promise<void> {
    await this.setProperty('brightness', Math.max(-100, Math.min(100, val)))
  }

  async setContrast(val: number): Promise<void> {
    await this.setProperty('contrast', Math.max(-100, Math.min(100, val)))
  }

  async setSaturation(val: number): Promise<void> {
    await this.setProperty('saturation', Math.max(-100, Math.min(100, val)))
  }

  async setHue(val: number): Promise<void> {
    await this.setProperty('hue', Math.max(-100, Math.min(100, val)))
  }

  async setGamma(val: number): Promise<void> {
    await this.setProperty('gamma', Math.max(-100, Math.min(100, val)))
  }

  // ─── Deinterlace ─────────────────────────────────────────────────────────

  async setDeinterlace(mode: boolean | 'auto'): Promise<void> {
    await this.setProperty('deinterlace', mode)
  }

  // ─── Zoom & Pan ──────────────────────────────────────────────────────────

  async setZoom(zoom: number): Promise<void> {
    await this.setProperty('video-zoom', zoom)
  }

  async setPan(x: number, y: number): Promise<void> {
    await this.setProperty('video-pan-x', x)
    await this.setProperty('video-pan-y', y)
  }

  // ─── Playlist ────────────────────────────────────────────────────────────

  async playlistNext(): Promise<void> {
    await this.sendCommand(['playlist-next', 'force'])
  }

  async playlistPrev(): Promise<void> {
    await this.sendCommand(['playlist-prev', 'force'])
  }

  async playlistPlayIndex(index: number): Promise<void> {
    await this.setProperty('playlist-pos', index)
  }

  async playlistClear(): Promise<void> {
    await this.sendCommand(['playlist-clear'])
  }

  async playlistAppend(path: string): Promise<void> {
    await this.sendCommand(['loadfile', path, 'append'])
  }

  async playlistRemove(index: number): Promise<void> {
    await this.sendCommand(['playlist-remove', index])
  }

  // ─── HDR / Tone Mapping ──────────────────────────────────────────────────

  async setHdrToneMapping(enabled: boolean): Promise<void> {
    await this.setProperty('tone-mapping', enabled ? 'hable' : 'clip')
  }

  // ─── Subtitle Styling ────────────────────────────────────────────────────

  async setSubStyle(opts: {
    fontName?: string
    fontSize?: number
    color?: string
    borderColor?: string
    borderSize?: number
  }): Promise<void> {
    if (opts.fontName) await this.setProperty('sub-font', opts.fontName)
    if (opts.fontSize) await this.setProperty('sub-font-size', opts.fontSize)
    if (opts.borderSize !== undefined) await this.setProperty('sub-border-size', opts.borderSize)
    if (opts.color) {
      // mpv accepts color as &HBBGGRR& format
      const mpvColor = hexToMpvColor(opts.color)
      await this.setProperty('sub-color', mpvColor)
    }
  }

  // ─── Playlist Info ───────────────────────────────────────────────────────

  async getPlaylist(): Promise<unknown> {
    return this.getProperty('playlist')
  }

  async getTrackList(): Promise<MediaTrack[]> {
    const data = await this.getProperty('track-list')
    return this.parseTrackList(data)
  }

  async getChapterList(): Promise<Chapter[]> {
    const data = await this.getProperty('chapter-list')
    return this.parseChapterList(data)
  }

  // ─── Parse Helpers ───────────────────────────────────────────────────────

  private parseTrackList(data: unknown): MediaTrack[] {
    if (!Array.isArray(data)) return []
    return data.map((t: Record<string, unknown>) => ({
      id: t.id as number,
      type: t.type as 'video' | 'audio' | 'sub',
      title: t.title as string | undefined,
      lang: t.lang as string | undefined,
      codec: t.codec as string | undefined,
      default: t.default as boolean | undefined,
      forced: t.forced as boolean | undefined,
      external: t.external as boolean | undefined,
      externalFilename: t['external-filename'] as string | undefined,
      selected: t.selected as boolean | undefined,
    }))
  }

  private parseChapterList(data: unknown): Chapter[] {
    if (!Array.isArray(data)) return []
    return data.map((c: Record<string, unknown>) => ({
      title: (c.title as string) || `Chapter ${String(c.index ?? '')}`,
      time: c.time as number,
    }))
  }

  // ─── Getters ─────────────────────────────────────────────────────────────

  get isConnected(): boolean {
    return this.pipe.connected
  }

  get currentEqBands(): number[] {
    return [...this.eqBands]
  }

  get isEqEnabled(): boolean {
    return this.eqEnabled
  }

  /** Get mpv's native window HWND (as number) — available after IPC connects */
  async getWindowId(): Promise<number | null> {
    try {
      const val = await this.getProperty('window-id')
      if (typeof val === 'number') return val
      if (typeof val === 'string') return parseInt(val, 10) || null
      return null
    } catch {
      return null
    }
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function hexToMpvColor(hex: string): string {
  const clean = hex.replace('#', '')
  if (clean.length === 6) {
    const r = clean.slice(0, 2)
    const g = clean.slice(2, 4)
    const b = clean.slice(4, 6)
    return `&H00${b}${g}${r}&`
  }
  return '&H00FFFFFF&'
}
