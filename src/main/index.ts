import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  nativeImage,
  Menu,
  globalShortcut,
} from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { is } from '@electron-toolkit/utils'
import { MpvManager } from './mpv/mpv-manager'
import { MediaScanner } from './library/media-scanner'
import {
  setupThumbnailToolbar,
  updateThumbnailPlayButton,
  setTaskbarProgress,
  updateJumpList,
  createTray,
  updateTrayMenu,
  destroyTray,
} from './windows/taskbar'
import {
  createNativeVideoWindow,
  moveNativeVideoWindow,
  showNativeVideoWindow,
  hideNativeVideoWindow,
  destroyNativeVideoWindow,
  getNativeVideoHwnd,
} from './windows/native-video-window'
import {
  registerFileAssociations,
  unregisterFileAssociations,
  setDefaultApp,
  isFileAssociationsRegistered,
} from './windows/file-associations'
import {
  upsertMediaItem,
  getAllMediaItems,
  removeMediaItem,
  updateWatchedProgress,
  saveBookmark,
  getBookmark,
  deleteBookmark,
  addRecentFile,
  getRecentFiles,
  closeDb,
} from './library/media-db'
import { setupAutoUpdater, installUpdate } from './updater/auto-updater'
import { IPC } from '../shared/types'
import Store from 'electron-store'
import type { AppSettings } from '../shared/types'
import { DEFAULT_SHORTCUTS } from '../shared/constants'

// ─── Paths ───────────────────────────────────────────────────────────────────

const resourcesPath = app.isPackaged
  ? join(process.resourcesPath)
  : join(__dirname, '../../resources')

const mpvBin = join(resourcesPath, 'mpv', 'mpv.exe')
const ffmpegBin = join(resourcesPath, 'ffmpeg', 'ffmpeg.exe')
const ffprobeBin = join(resourcesPath, 'ffmpeg', 'ffprobe.exe')
const ytdlpBin = join(resourcesPath, 'yt-dlp', 'yt-dlp.exe')
// mpv config dir = resources/mpv/ — this is where our mpv.conf actually lives.
// Previously pointed to AppData which was empty, so mpv used built-in defaults (GPU VO → crash).
const mpvConfigDir = join(resourcesPath, 'mpv')

const userDataDir = join(app.getPath('userData'), 'flux')
const coverArtDir = join(userDataDir, 'covers')
const screenshotDir = join(app.getPath('pictures'), 'FLUX Screenshots')

// ─── Settings Store ───────────────────────────────────────────────────────────

const defaultSettings: AppSettings = {
  general: {
    theme: 'dark',
    language: 'en',
    resumePlayback: true,
    rememberVolume: true,
    startMinimized: false,
    minimizeToTray: false,
    closeToTray: false,
    autoCheckUpdates: true,
    screenshotPath: screenshotDir,
    screenshotFormat: 'png',
    openLastFile: false,
    recentFilesCount: 50,
  },
  playback: {
    defaultSpeed: 1.0,
    defaultVolume: 100,
    pauseOnMinimize: false,
    pauseOnFocusLost: false,
    skipSeconds: 10,
    bigSkipSeconds: 60,
    loopMode: 'none',
    shuffleMode: false,
    hardwareDecoding: 'auto',
  },
  audio: {
    defaultTrackLang: 'und',
    volumeBoost: 0,
    normalizeAudio: false,
    audioDelay: 0,
    equalizer: Array(15).fill(0),
    equalizerPreset: 'Flat',
    equalizerEnabled: false,
  },
  video: {
    defaultAspect: '',
    interpolation: false,
    deinterlace: 'auto',
    vo: 'gpu-next',
    gpuApi: 'd3d11',
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    gamma: 0,
    denoise: 0,
    sharpen: 0,
    hdrToneMapping: true,
  },
  subtitles: {
    defaultTrackLang: 'und',
    fontName: 'Arial',
    fontSize: 40,
    color: '#FFFFFF',
    borderColor: '#000000',
    borderSize: 2,
    subtitleDelay: 0,
    autoLoad: true,
    subtitlePath: '',
    openSubtitlesApiKey: '',
  },
  shortcuts: { ...DEFAULT_SHORTCUTS },
  library: {
    watchFolders: [],
    autoScan: false,
    scanOnStartup: false,
    thumbnailsEnabled: true,
  },
  integrations: {
    fileAssociationsRegistered: false,
    contextMenuRegistered: false,
    startWithWindows: false,
  },
}

const store = new Store<AppSettings>({
  defaults: defaultSettings,
  name: 'settings',
})

// ─── Globals ─────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null
let mpv: MpvManager | null = null
let scanner: MediaScanner | null = null
let isQuitting = false
let currentTitle = ''
let currentPath: string | null = null
let currentPosition = 0
let currentDuration = 0
let isPlayingState = false
let lastVideoBounds = { x: 0, y: 36, w: 800, h: 500 }

// ─── Single Instance Lock ─────────────────────────────────────────────────────

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

app.on('second-instance', (_event, argv) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    const fileArg = argv.find((a) => existsSync(a) && !a.endsWith('.exe') && !a.endsWith('.js'))
    if (fileArg && mpv) {
      if (mpv.isConnected) {
        mpv.loadFile(fileArg).catch(console.error)
      } else {
        mpv.once('ready', () => mpv!.loadFile(fileArg).catch(console.error))
      }
    }
  }
})

// ─── App Ready ────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  // Ensure required directories exist
  ;[userDataDir, mpvConfigDir, coverArtDir, screenshotDir].forEach((d) => {
    if (!existsSync(d)) mkdirSync(d, { recursive: true })
  })

  createMainWindow()
  registerIpcHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  destroyTray()
  destroyNativeVideoWindow()
  closeDb()
  if (mpv) {
    mpv.stop().catch(() => {})
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle file open from OS
app.on('open-file', (_event, path) => {
  if (mpv?.isConnected) {
    mpv.loadFile(path).catch(console.error)
  }
})

// ─── Main Window ─────────────────────────────────────────────────────────────

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 400,
    show: false,
    frame: false,
    // transparent=true is required so DWM composites the native WS_CHILD video window
    // (mpv's render surface) below Chromium's web layer.
    // Without this, Chromium's D3D swap chain paints over the child window.
    transparent: true,
    backgroundColor: '#00000000',
    icon: join(resourcesPath, 'icons', 'icon.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  })

  mainWindow.on('ready-to-show', async () => {
    mainWindow!.show()

    // Get main window HWND and create a native WS_CHILD window for mpv.
    // This is the VLC approach: a true child window embedded inside the main window,
    // NOT a separate floating BrowserWindow.
    const mainHwndBuf = mainWindow!.getNativeWindowHandle()
    const mainHwnd = mainHwndBuf.readBigUInt64LE(0)
    const [cw, ch] = mainWindow!.getContentSize()
    const titleH = 36, ctrlH = 88
    const videoH = Math.max(1, ch - titleH - ctrlH)
    const nativeHwnd = createNativeVideoWindow(mainHwnd, 0, titleH, cw, videoH)
    if (!nativeHwnd) {
      console.error('[Main] Failed to create native video window')
    } else {
      console.log(`[Main] Native WS_CHILD video window: ${nativeHwnd}`)
    }

    // Initialize mpv with the native WS_CHILD HWND via --wid
    mpv = new MpvManager({
      binaryPath: mpvBin,
      configDir: mpvConfigDir,
      hwnd: nativeHwnd,
    })

    // Initialize media scanner
    scanner = new MediaScanner(ffprobeBin, coverArtDir)

    bindMpvEvents()

    await mpv.start(nativeHwnd)

    // Setup Windows integrations
    setupThumbnailToolbar(mainWindow!, {
      onPrev: () => mpv?.playlistPrev().catch(() => {}),
      onPlayPause: () => mpv?.togglePause().catch(() => {}),
      onNext: () => mpv?.playlistNext().catch(() => {}),
    })

    createTray(mainWindow!, {
      onShow: toggleMainWindow,
      onPlayPause: () => mpv?.togglePause().catch(() => {}),
      onNext: () => mpv?.playlistNext().catch(() => {}),
      onPrev: () => mpv?.playlistPrev().catch(() => {}),
      onQuit: () => {
        isQuitting = true
        app.quit()
      },
    })

    // Load recent files into Jump List
    try {
      const recent = getRecentFiles(10)
      updateJumpList(recent.map((r) => ({ path: r.path, title: r.title })))
    } catch {
      updateJumpList([])
    }

    // Setup auto-updater
    setupAutoUpdater(mainWindow!)

    // Handle files passed via command-line (e.g. double-clicking a file in Explorer).
    // ONLY in production — in dev mode, process.argv contains electron-vite internal paths
    // (like '.', '--inspect=...') that would incorrectly trigger mpv file loading.
    if (!is.dev) {
      const MEDIA_EXTS_PROD = new Set([
        '.mkv','.mp4','.avi','.mov','.wmv','.flv','.webm','.ts','.mts','.m2ts','.mpg','.mpeg',
        '.m4v','.vob','.rmvb','.rm','.3gp','.ogv','.divx','.f4v',
        '.mp3','.flac','.aac','.wav','.ogg','.opus','.m4a','.wma','.ac3','.dts','.ape','.alac','.mka',
      ])
      const path = require('path')
      const fileArg = process.argv.slice(1).find((a: string) => {
        const ext = path.extname(a).toLowerCase()
        return ext.length > 1 && MEDIA_EXTS_PROD.has(ext) && existsSync(a)
      })
      if (fileArg) {
        const loadWhenReady = () => mpv!.loadFile(fileArg).catch(console.error)
        if (mpv.isConnected) loadWhenReady()
        else {
          mpv.once('ready', loadWhenReady)
          setTimeout(() => { mpv?.off('ready', loadWhenReady) }, 10000)
        }
      }
    }
  })

  mainWindow.on('close', (e) => {
    const settings = store.get('general')
    if (!isQuitting && settings.closeToTray) {
      e.preventDefault()
      mainWindow!.hide()
      return
    }
    // Save current position as bookmark
    if (currentPath && currentPosition > 10) {
      saveBookmark(currentPath, currentPosition)
    }
  })

  mainWindow.on('minimize', () => {
    const settings = store.get('playback') as AppSettings['playback']
    if (settings.pauseOnMinimize) {
      mpv?.pause().catch(() => {})
    }
  })

  // Drag & drop file support
  mainWindow.webContents.on('will-navigate', (e) => {
    e.preventDefault()
  })

  // Load the renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    // DevTools disabled — it shifts the layout and causes noise in dev
    // Uncomment the line below to re-enable:
    // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function toggleMainWindow(): void {
  if (!mainWindow) return
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    mainWindow.show()
    mainWindow.focus()
  }
}

// ─── mpv Event Bindings ──────────────────────────────────────────────────────

function bindMpvEvents(): void {
  if (!mpv || !mainWindow) return

  mpv.on('timePos', (pos: number) => {
    currentPosition = pos
    mainWindow?.webContents.send(IPC.POSITION_UPDATE, pos)
    // Update taskbar progress
    if (currentDuration > 0) {
      setTaskbarProgress(mainWindow!, pos / currentDuration)
    }
    // Auto-save progress every 5s
    if (currentPath && Math.round(pos) % 5 === 0 && currentDuration > 0) {
      const pct = (pos / currentDuration) * 100
      updateWatchedProgress(currentPath, pct)
    }
  })

  mpv.on('duration', (dur: number) => {
    currentDuration = dur
    mainWindow?.webContents.send(IPC.STATE_UPDATE, { duration: dur })
  })

  mpv.on('pause', (paused: boolean) => {
    isPlayingState = !paused
    mainWindow?.webContents.send(IPC.STATE_UPDATE, { isPlaying: !paused })
    updateThumbnailPlayButton(mainWindow!, !paused)
    updateTrayMenu(currentTitle)
  })

  mpv.on('idle', (idle: boolean) => {
    mainWindow?.webContents.send(IPC.STATE_UPDATE, { isIdle: idle })
    if (idle) {
      setTaskbarProgress(mainWindow!, -1)
      hideNativeVideoWindow()   // hide the native video window → home screen visible
    }
  })

  mpv.on('volume', (vol: number) => {
    mainWindow?.webContents.send(IPC.STATE_UPDATE, { volume: vol })
  })

  mpv.on('muted', (muted: boolean) => {
    mainWindow?.webContents.send(IPC.STATE_UPDATE, { muted })
  })

  mpv.on('speed', (speed: number) => {
    mainWindow?.webContents.send(IPC.STATE_UPDATE, { speed })
  })

  mpv.on('mediaTitle', (title: string) => {
    const t = String(title || '').trim()
    // Skip titles that look like system/icon files, not actual media
    const ext = t.split('.').pop()?.toLowerCase() ?? ''
    const isSystemFile = ['png','jpg','jpeg','ico','svg','gif','bmp','webp','exe','dll','js','json','md','txt','html','css'].includes(ext)
    if (isSystemFile) return  // ignore non-media titles from mpv window context
    currentTitle = t
    if (currentTitle) mainWindow?.setTitle(`FLUX — ${currentTitle}`)
    mainWindow?.webContents.send(IPC.STATE_UPDATE, { mediaTitle: currentTitle })
    updateTrayMenu(currentTitle)
    mainWindow?.webContents.send(IPC.NOW_PLAYING, currentTitle)
  })

  mpv.on('trackList', (tracks) => {
    mainWindow?.webContents.send(IPC.TRACKS_CHANGED, tracks)
  })

  mpv.on('chapterList', (chapters) => {
    mainWindow?.webContents.send(IPC.CHAPTERS_CHANGED, chapters)
  })

  mpv.on('videoParams', (params) => {
    mainWindow?.webContents.send(IPC.STATE_UPDATE, { videoParams: params })
  })

  mpv.on('audioParams', (params) => {
    mainWindow?.webContents.send(IPC.STATE_UPDATE, { audioParams: params })
  })

  mpv.on('hwdec', (mode) => {
    mainWindow?.webContents.send(IPC.STATE_UPDATE, { hwdecActive: mode !== 'no' })
  })

  mpv.on('seeking', (seeking: boolean) => {
    mainWindow?.webContents.send(IPC.STATE_UPDATE, { isBuffering: seeking })
  })

  mpv.on('fileLoaded', async () => {
    mainWindow?.webContents.send(IPC.FILE_LOADED)
    setTaskbarProgress(mainWindow!, 0)
    // Resize native window to current video bounds, then show it
    const b = lastVideoBounds
    moveNativeVideoWindow(b.x, b.y, b.w, b.h)
    showNativeVideoWindow()
  })

  mpv.on('eof', () => {
    mainWindow?.webContents.send(IPC.EOF)
    setTaskbarProgress(mainWindow!, -1)
    try {
      if (currentPath) {
        addRecentFile(currentPath, currentTitle, currentDuration, 100)
        updateJumpList(getRecentFiles(10).map((r) => ({ path: r.path, title: r.title })))
      }
    } catch { /* SQLite not ready yet */ }
  })

  mpv.on('startFile', () => {
    mainWindow?.webContents.send(IPC.STATE_UPDATE, { isBuffering: true })
    setTaskbarProgress(mainWindow!, 2) // indeterminate
  })

  mpv.on('playbackRestart', () => {
    mainWindow?.webContents.send(IPC.STATE_UPDATE, { isBuffering: false })
  })

  mpv.on('crashed', () => {
    console.error('[Main] mpv crashed, restarting...')
    if (mainWindow && mpv?.isConnected === false) return
    mainWindow?.webContents.send(IPC.MPV_ERROR, 'mpv process crashed and was restarted')
  })

  mpv.on('error', (err: Error) => {
    mainWindow?.webContents.send(IPC.MPV_ERROR, err.message)
  })

  mpv.on('ready', () => {
    // IPC pipe connected — mpv is running in idle, no video window yet.
    // Window will be created when first file loads.
    mainWindow?.webContents.send(IPC.STATE_UPDATE, { isIdle: true })
    console.log('[Main] mpv IPC connected and ready')
  })
}

// ─── Helper: wait for mpv IPC to be ready before sending commands ─────────────
let _mpvReadyPromise: Promise<void> | null = null
function waitForMpv(): Promise<void> {
  if (!mpv) return Promise.reject(new Error('mpv not initialized'))
  if (mpv.isConnected) return Promise.resolve()
  if (!_mpvReadyPromise) {
    _mpvReadyPromise = new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => { _mpvReadyPromise = null; reject(new Error('mpv connection timeout')) }, 35000)
      mpv!.once('ready', () => { clearTimeout(t); _mpvReadyPromise = null; resolve() })
      mpv!.once('error', (e: Error) => { clearTimeout(t); _mpvReadyPromise = null; reject(e) })
    })
  }
  return _mpvReadyPromise
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

function registerIpcHandlers(): void {
  // ── Player commands ────────────────────────────────────────────────────────
  ipcMain.handle(IPC.LOAD_FILE, async (_e, filePath: string) => {
    if (!mpv) return
    currentPath = filePath
    await waitForMpv()
    const bookmark = getBookmark(filePath)
    await mpv.loadFile(filePath)
    if (bookmark && bookmark > 5) {
      const onLoaded = () => {
        mpv?.seek(bookmark, 'absolute').catch(() => {})
        mpv?.off('fileLoaded', onLoaded)
      }
      mpv.once('fileLoaded', onLoaded)
    }
  })

  ipcMain.handle(IPC.LOAD_URL, async (_e, url: string) => {
    if (!mpv) return
    currentPath = url
    await waitForMpv()
    await mpv.loadUrl(url, ytdlpBin)
  })

  ipcMain.handle(IPC.PLAY_PAUSE, () => mpv?.togglePause())
  ipcMain.handle(IPC.STOP, () => { hideMpvView(); return mpv?.stopMedia() })
  ipcMain.handle(IPC.SEEK, (_e, pos: number) => mpv?.seek(pos, 'absolute'))
  ipcMain.handle(IPC.SEEK_RELATIVE, (_e, delta: number) => mpv?.seek(delta, 'relative'))
  ipcMain.handle(IPC.SET_VOLUME, (_e, vol: number) => mpv?.setVolume(vol))
  ipcMain.handle(IPC.SET_MUTED, (_e, muted: boolean) => mpv?.setMuted(muted))
  ipcMain.handle(IPC.SET_SPEED, (_e, speed: number) => mpv?.setSpeed(speed))
  ipcMain.handle(IPC.SET_AUDIO_TRACK, (_e, id: number) => mpv?.setAudioTrack(id))
  ipcMain.handle(IPC.SET_SUB_TRACK, (_e, id: number | false) => mpv?.setSubTrack(id))
  ipcMain.handle(IPC.SET_VIDEO_TRACK, (_e, id: number) => mpv?.setVideoTrack(id))
  ipcMain.handle(IPC.SET_AUDIO_DELAY, (_e, delay: number) => mpv?.setAudioDelay(delay))
  ipcMain.handle(IPC.SET_SUB_DELAY, (_e, delay: number) => mpv?.setSubDelay(delay))
  ipcMain.handle(IPC.SET_ASPECT, (_e, aspect: string) => mpv?.setAspect(aspect))
  ipcMain.handle(IPC.SET_EQUALIZER, (_e, bands: number[], enabled: boolean) =>
    mpv?.setEqualizer(bands, enabled)
  )
  ipcMain.handle(IPC.SET_EQUALIZER_ENABLED, (_e, enabled: boolean) =>
    mpv?.setEqualizerEnabled(enabled)
  )
  ipcMain.handle(IPC.SET_VIDEO_FILTER, (_e, name: string, params?: string) =>
    mpv?.setVideoFilter(name, params)
  )
  ipcMain.handle(IPC.SET_COLOR, (_e, prop: string, val: number) => {
    switch (prop) {
      case 'brightness': return mpv?.setBrightness(val)
      case 'contrast': return mpv?.setContrast(val)
      case 'saturation': return mpv?.setSaturation(val)
      case 'hue': return mpv?.setHue(val)
      case 'gamma': return mpv?.setGamma(val)
    }
  })
  ipcMain.handle(IPC.SET_AB_LOOP_A, (_e, time: number) => mpv?.setAbLoopA(time))
  ipcMain.handle(IPC.SET_AB_LOOP_B, (_e, time: number) => mpv?.setAbLoopB(time))
  ipcMain.handle(IPC.CLEAR_AB_LOOP, () => mpv?.clearAbLoop())
  ipcMain.handle(IPC.FRAME_STEP, () => mpv?.frameStep())
  ipcMain.handle(IPC.FRAME_BACK_STEP, () => mpv?.frameBackStep())
  ipcMain.handle(IPC.TAKE_SCREENSHOT, async () => {
    const settings = store.get('general') as AppSettings['general']
    await mpv?.takeScreenshot(settings.screenshotPath, settings.screenshotFormat)
    shell.openPath(settings.screenshotPath).catch(() => {})
  })
  ipcMain.handle(IPC.SET_FULLSCREEN, (_e, fs: boolean) => {
    mainWindow?.[fs ? 'setFullScreen' : 'setFullScreen'](fs)
    mpv?.setFullscreen(fs)
  })
  ipcMain.handle(IPC.NEXT_CHAPTER, () => mpv?.nextChapter())
  ipcMain.handle(IPC.PREV_CHAPTER, () => mpv?.prevChapter())
  ipcMain.handle(IPC.SEEK_CHAPTER, (_e, idx: number) => mpv?.seekChapter(idx))
  ipcMain.handle(IPC.ADD_SUBTITLE_FILE, (_e, filePath: string) => mpv?.addSubtitleFile(filePath))
  ipcMain.handle(IPC.LOAD_NEXT, () => mpv?.playlistNext())
  ipcMain.handle(IPC.LOAD_PREV, () => mpv?.playlistPrev())
  ipcMain.handle(IPC.ZOOM, (_e, zoom: number) => mpv?.setZoom(zoom))
  ipcMain.handle(IPC.PAN, (_e, x: number, y: number) => mpv?.setPan(x, y))
  ipcMain.handle(IPC.MPV_COMMAND, (_e, cmd: unknown[]) => mpv?.sendCommand(cmd))

  // ── Window commands ────────────────────────────────────────────────────────
  ipcMain.on(IPC.WINDOW_MINIMIZE, () => mainWindow?.minimize())
  ipcMain.on(IPC.WINDOW_MAXIMIZE, () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.on(IPC.WINDOW_CLOSE, () => mainWindow?.close())
  ipcMain.handle(IPC.WINDOW_IS_MAXIMIZED, () => mainWindow?.isMaximized() ?? false)

  // ── mpv view show/hide (renderer calls these when switching HTML5 ↔ mpv) ──
  ipcMain.on(IPC.MPV_VIEW_SHOW, () => showNativeVideoWindow())
  ipcMain.on(IPC.MPV_VIEW_HIDE, () => hideNativeVideoWindow())

  ipcMain.handle(IPC.VIDEO_AREA_BOUNDS, (_e, bounds: { x: number; y: number; w: number; h: number }) => {
    lastVideoBounds = bounds
    // Keep the native WS_CHILD window perfectly aligned with the React video container
    moveNativeVideoWindow(bounds.x, bounds.y, bounds.w, bounds.h)
    return bounds
  })

  // ── Dialog commands ────────────────────────────────────────────────────────
  ipcMain.handle(IPC.OPEN_FILE_DIALOG, async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Open Media File',
      filters: [
        {
          name: 'All Media',
          extensions: ['mkv', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'ts', 'mpg', 'mpeg',
            'mp3', 'flac', 'aac', 'wav', 'ogg', 'opus', 'm4a', 'wma', 'ac3', 'dts',
            'ape', 'alac', 'm4v', 'm2ts', 'mts', 'vob', 'rm', 'rmvb', '3gp', 'asf'],
        },
        { name: 'Video Files', extensions: ['mkv', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'ts', 'mpg', 'mpeg', 'm4v', 'm2ts', 'mts', 'vob', 'rm', 'rmvb', '3gp', 'asf'] },
        { name: 'Audio Files', extensions: ['mp3', 'flac', 'aac', 'wav', 'ogg', 'opus', 'm4a', 'wma', 'ac3', 'dts', 'ape', 'alac'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths
    }
    return null
  })

  ipcMain.handle(IPC.OPEN_FOLDER_DIALOG, async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Select Media Folder',
      properties: ['openDirectory'],
    })
    if (!result.canceled && result.filePaths[0]) {
      return result.filePaths[0]
    }
    return null
  })

  ipcMain.handle(IPC.OPEN_SUBTITLE_DIALOG, async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Open Subtitle File',
      filters: [
        { name: 'Subtitle Files', extensions: ['srt', 'ass', 'ssa', 'sub', 'vtt', 'smi', 'usf'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    })
    if (!result.canceled && result.filePaths[0]) {
      return result.filePaths[0]
    }
    return null
  })

  // ── Library commands ───────────────────────────────────────────────────────
  ipcMain.handle(IPC.LIBRARY_GET_ALL, () => getAllMediaItems())
  ipcMain.handle(IPC.LIBRARY_GET_RECENT, (_e, limit?: number) => getRecentFiles(limit))
  ipcMain.handle(IPC.LIBRARY_SCAN_FOLDER, async (_e, folder: string) => {
    await scanner?.scanFolder(folder)
  })
  ipcMain.handle(IPC.LIBRARY_REMOVE_ITEM, (_e, filePath: string) => removeMediaItem(filePath))
  ipcMain.handle(IPC.LIBRARY_UPDATE_PROGRESS, (_e, filePath: string, percent: number) =>
    updateWatchedProgress(filePath, percent)
  )

  ipcMain.handle(IPC.LIBRARY_GET_MEDIA_INFO, async (_e, filePath: string) => {
    return scanner?.probeFile(filePath) ?? null
  })

  // ── Settings commands ──────────────────────────────────────────────────────
  ipcMain.handle(IPC.SETTINGS_GET, () => store.store)
  ipcMain.handle(IPC.SETTINGS_SET, (_e, key: string, value: unknown) => {
    store.set(key, value)
    applySettingsChange(key, value)
  })
  ipcMain.handle(IPC.SETTINGS_RESET, () => {
    store.reset(...(Object.keys(defaultSettings) as (keyof AppSettings)[]))
  })

  // ── Integration commands ────────────────────────────────────────────────────
  ipcMain.handle(IPC.REGISTER_FILE_ASSOCIATIONS, () => {
    registerFileAssociations()
    store.set('integrations.fileAssociationsRegistered', true)
  })
  ipcMain.handle(IPC.UNREGISTER_FILE_ASSOCIATIONS, () => {
    unregisterFileAssociations()
    store.set('integrations.fileAssociationsRegistered', false)
  })
  ipcMain.handle(IPC.SET_AS_DEFAULT_APP, () => setDefaultApp())
  ipcMain.handle(IPC.SET_START_WITH_WINDOWS, (_e, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled, name: 'FLUX' })
    store.set('integrations.startWithWindows', enabled)
  })

  // ── Updater commands ────────────────────────────────────────────────────────
  ipcMain.handle(IPC.CHECK_UPDATE, () => {
    const { autoUpdater } = require('electron-updater')
    return autoUpdater.checkForUpdates()
  })
  ipcMain.handle(IPC.INSTALL_UPDATE, () => installUpdate())

  // ── Bookmarks ──────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.SAVE_BOOKMARK, (_e, filePath: string, position: number) => {
    saveBookmark(filePath, position)
  })
  ipcMain.handle(IPC.GET_BOOKMARK, (_e, filePath: string) => getBookmark(filePath))
  ipcMain.handle(IPC.DELETE_BOOKMARK, (_e, filePath: string) => deleteBookmark(filePath))

  // ── App info ───────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.GET_APP_VERSION, () => app.getVersion())
  ipcMain.handle(IPC.GET_PATHS, () => ({
    userData: app.getPath('userData'),
    pictures: app.getPath('pictures'),
    home: app.getPath('home'),
    screenshotDir,
    mpvConfigDir,
  }))

  // ── Subtitle search ────────────────────────────────────────────────────────
  ipcMain.handle(IPC.SUBTITLE_SEARCH, async (_e, query: string, language?: string) => {
    return searchOpenSubtitles(query, language)
  })
  ipcMain.handle(IPC.SUBTITLE_DOWNLOAD, async (_e, downloadUrl: string, destPath: string) => {
    return downloadSubtitle(downloadUrl, destPath)
  })
}

// ─── Settings Application ────────────────────────────────────────────────────

function applySettingsChange(key: string, value: unknown): void {
  if (!mpv || !mpv.isConnected) return

  if (key === 'audio.equalizer' || key === 'audio.equalizerEnabled') {
    const audioSettings = store.get('audio') as AppSettings['audio']
    mpv.setEqualizer(audioSettings.equalizer, audioSettings.equalizerEnabled).catch(() => {})
  }
  if (key === 'audio.normalizeAudio') {
    mpv.setAudioNormalize(value as boolean).catch(() => {})
  }
  if (key === 'video.brightness') mpv.setBrightness(value as number).catch(() => {})
  if (key === 'video.contrast') mpv.setContrast(value as number).catch(() => {})
  if (key === 'video.saturation') mpv.setSaturation(value as number).catch(() => {})
  if (key === 'video.hue') mpv.setHue(value as number).catch(() => {})
  if (key === 'video.gamma') mpv.setGamma(value as number).catch(() => {})
  if (key === 'video.hdrToneMapping') mpv.setHdrToneMapping(value as boolean).catch(() => {})
}

// ─── OpenSubtitles API ───────────────────────────────────────────────────────

async function searchOpenSubtitles(
  query: string,
  language = 'en'
): Promise<unknown[]> {
  const apiKey = (store.get('subtitles') as AppSettings['subtitles']).openSubtitlesApiKey
  if (!apiKey) return []

  try {
    const { net } = require('electron')
    const url = `https://api.opensubtitles.com/api/v1/subtitles?query=${encodeURIComponent(query)}&languages=${language}&per_page=10`
    // Use electron's net module for secure requests
    const response = await new Promise<string>((resolve, reject) => {
      const request = net.request({
        url,
        method: 'GET',
      })
      request.setHeader('Api-Key', apiKey)
      request.setHeader('Content-Type', 'application/json')
      request.setHeader('User-Agent', 'FLUX Media Player v1.0')
      let body = ''
      request.on('response', (res) => {
        res.on('data', (chunk) => (body += chunk.toString()))
        res.on('end', () => resolve(body))
      })
      request.on('error', reject)
      request.end()
    })
    const data = JSON.parse(response)
    return data.data ?? []
  } catch {
    return []
  }
}

async function downloadSubtitle(downloadUrl: string, destPath: string): Promise<boolean> {
  // The actual download logic would use electron's net module or https
  // to securely download the subtitle file
  try {
    const { net } = require('electron')
    const data = await new Promise<Buffer>((resolve, reject) => {
      const request = net.request(downloadUrl)
      const chunks: Buffer[] = []
      request.on('response', (res) => {
        res.on('data', (chunk) => chunks.push(chunk as Buffer))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      })
      request.on('error', reject)
      request.end()
    })
    require('fs').writeFileSync(destPath, data)
    return true
  } catch {
    return false
  }
}
