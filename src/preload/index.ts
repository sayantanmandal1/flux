import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'
import type { AppSettings, MediaTrack, Chapter, RecentFile, MediaItem } from '../shared/types'

// ─── Type-safe IPC API exposed to renderer ──────────────────────────────────

const api = {
  // ── Player controls ────────────────────────────────────────────────────────
  loadFile: (filePath: string) => ipcRenderer.invoke(IPC.LOAD_FILE, filePath),
  loadUrl: (url: string) => ipcRenderer.invoke(IPC.LOAD_URL, url),
  playPause: () => ipcRenderer.invoke(IPC.PLAY_PAUSE),
  stop: () => ipcRenderer.invoke(IPC.STOP),
  seek: (pos: number) => ipcRenderer.invoke(IPC.SEEK, pos),
  seekRelative: (delta: number) => ipcRenderer.invoke(IPC.SEEK_RELATIVE, delta),
  setVolume: (vol: number) => ipcRenderer.invoke(IPC.SET_VOLUME, vol),
  setMuted: (muted: boolean) => ipcRenderer.invoke(IPC.SET_MUTED, muted),
  setSpeed: (speed: number) => ipcRenderer.invoke(IPC.SET_SPEED, speed),
  setAudioTrack: (id: number) => ipcRenderer.invoke(IPC.SET_AUDIO_TRACK, id),
  setSubTrack: (id: number | false) => ipcRenderer.invoke(IPC.SET_SUB_TRACK, id),
  setVideoTrack: (id: number) => ipcRenderer.invoke(IPC.SET_VIDEO_TRACK, id),
  setAudioDelay: (delay: number) => ipcRenderer.invoke(IPC.SET_AUDIO_DELAY, delay),
  setSubDelay: (delay: number) => ipcRenderer.invoke(IPC.SET_SUB_DELAY, delay),
  setAspect: (aspect: string) => ipcRenderer.invoke(IPC.SET_ASPECT, aspect),
  setEqualizer: (bands: number[], enabled: boolean) =>
    ipcRenderer.invoke(IPC.SET_EQUALIZER, bands, enabled),
  setEqualizerEnabled: (enabled: boolean) =>
    ipcRenderer.invoke(IPC.SET_EQUALIZER_ENABLED, enabled),
  setVideoFilter: (name: string, params?: string) =>
    ipcRenderer.invoke(IPC.SET_VIDEO_FILTER, name, params),
  setColor: (prop: string, val: number) => ipcRenderer.invoke(IPC.SET_COLOR, prop, val),
  setAbLoopA: (time: number) => ipcRenderer.invoke(IPC.SET_AB_LOOP_A, time),
  setAbLoopB: (time: number) => ipcRenderer.invoke(IPC.SET_AB_LOOP_B, time),
  clearAbLoop: () => ipcRenderer.invoke(IPC.CLEAR_AB_LOOP),
  frameStep: () => ipcRenderer.invoke(IPC.FRAME_STEP),
  frameBackStep: () => ipcRenderer.invoke(IPC.FRAME_BACK_STEP),
  takeScreenshot: () => ipcRenderer.invoke(IPC.TAKE_SCREENSHOT),
  setFullscreen: (fs: boolean) => ipcRenderer.invoke(IPC.SET_FULLSCREEN, fs),
  nextChapter: () => ipcRenderer.invoke(IPC.NEXT_CHAPTER),
  prevChapter: () => ipcRenderer.invoke(IPC.PREV_CHAPTER),
  seekChapter: (idx: number) => ipcRenderer.invoke(IPC.SEEK_CHAPTER, idx),
  addSubtitleFile: (filePath: string) => ipcRenderer.invoke(IPC.ADD_SUBTITLE_FILE, filePath),
  loadNext: () => ipcRenderer.invoke(IPC.LOAD_NEXT),
  loadPrev: () => ipcRenderer.invoke(IPC.LOAD_PREV),
  zoom: (z: number) => ipcRenderer.invoke(IPC.ZOOM, z),
  pan: (x: number, y: number) => ipcRenderer.invoke(IPC.PAN, x, y),
  mpvCommand: (cmd: unknown[]) => ipcRenderer.invoke(IPC.MPV_COMMAND, cmd),

  // ── mpv view visibility (used by renderer to hide/show the video surface) ─
  showMpvView: () => ipcRenderer.send(IPC.MPV_VIEW_SHOW),
  hideMpvView: () => ipcRenderer.send(IPC.MPV_VIEW_HIDE),

  // ── Window controls ────────────────────────────────────────────────────────
  minimize: () => ipcRenderer.send(IPC.WINDOW_MINIMIZE),
  maximize: () => ipcRenderer.send(IPC.WINDOW_MAXIMIZE),
  close: () => ipcRenderer.send(IPC.WINDOW_CLOSE),
  isMaximized: () => ipcRenderer.invoke(IPC.WINDOW_IS_MAXIMIZED),
  setVideoAreaBounds: (bounds: { x: number; y: number; w: number; h: number }) =>
    ipcRenderer.invoke(IPC.VIDEO_AREA_BOUNDS, bounds),

  // ── Dialogs ────────────────────────────────────────────────────────────────
  openFileDialog: (): Promise<string[] | null> =>
    ipcRenderer.invoke(IPC.OPEN_FILE_DIALOG),
  openFolderDialog: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC.OPEN_FOLDER_DIALOG),
  openSubtitleDialog: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC.OPEN_SUBTITLE_DIALOG),

  // ── Library ────────────────────────────────────────────────────────────────
  libraryGetAll: (): Promise<MediaItem[]> => ipcRenderer.invoke(IPC.LIBRARY_GET_ALL),
  libraryGetRecent: (limit?: number): Promise<RecentFile[]> =>
    ipcRenderer.invoke(IPC.LIBRARY_GET_RECENT, limit),
  libraryScanFolder: (folder: string) => ipcRenderer.invoke(IPC.LIBRARY_SCAN_FOLDER, folder),
  libraryRemoveItem: (filePath: string) => ipcRenderer.invoke(IPC.LIBRARY_REMOVE_ITEM, filePath),
  libraryUpdateProgress: (filePath: string, percent: number) =>
    ipcRenderer.invoke(IPC.LIBRARY_UPDATE_PROGRESS, filePath, percent),
  libraryGetMediaInfo: (filePath: string) =>
    ipcRenderer.invoke(IPC.LIBRARY_GET_MEDIA_INFO, filePath),

  // ── Settings ───────────────────────────────────────────────────────────────
  settingsGet: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.SETTINGS_GET),
  settingsSet: (key: string, value: unknown) => ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),
  settingsReset: () => ipcRenderer.invoke(IPC.SETTINGS_RESET),

  // ── Integrations ───────────────────────────────────────────────────────────
  registerFileAssociations: () => ipcRenderer.invoke(IPC.REGISTER_FILE_ASSOCIATIONS),
  unregisterFileAssociations: () => ipcRenderer.invoke(IPC.UNREGISTER_FILE_ASSOCIATIONS),
  setAsDefaultApp: () => ipcRenderer.invoke(IPC.SET_AS_DEFAULT_APP),
  setStartWithWindows: (enabled: boolean) =>
    ipcRenderer.invoke(IPC.SET_START_WITH_WINDOWS, enabled),

  // ── Updater ────────────────────────────────────────────────────────────────
  checkUpdate: () => ipcRenderer.invoke(IPC.CHECK_UPDATE),
  installUpdate: () => ipcRenderer.invoke(IPC.INSTALL_UPDATE),

  // ── Bookmarks ─────────────────────────────────────────────────────────────
  saveBookmark: (filePath: string, position: number) =>
    ipcRenderer.invoke(IPC.SAVE_BOOKMARK, filePath, position),
  getBookmark: (filePath: string): Promise<number | null> =>
    ipcRenderer.invoke(IPC.GET_BOOKMARK, filePath),
  deleteBookmark: (filePath: string) => ipcRenderer.invoke(IPC.DELETE_BOOKMARK, filePath),

  // ── App info ───────────────────────────────────────────────────────────────
  getAppVersion: (): Promise<string> => ipcRenderer.invoke(IPC.GET_APP_VERSION),
  getPaths: () => ipcRenderer.invoke(IPC.GET_PATHS),

  // ── Subtitle search ────────────────────────────────────────────────────────
  subtitleSearch: (query: string, language?: string) =>
    ipcRenderer.invoke(IPC.SUBTITLE_SEARCH, query, language),
  subtitleDownload: (downloadUrl: string, destPath: string) =>
    ipcRenderer.invoke(IPC.SUBTITLE_DOWNLOAD, downloadUrl, destPath),

  // ── Event listeners ────────────────────────────────────────────────────────
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    // Only allow specific safe channels
    const allowedChannels = Object.values(IPC) as string[]
    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => listener(...args))
    }
  },
  off: (channel: string, listener: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, listener as Parameters<typeof ipcRenderer.removeListener>[1])
  },
  once: (channel: string, listener: (...args: unknown[]) => void) => {
    const allowedChannels = Object.values(IPC) as string[]
    if (allowedChannels.includes(channel)) {
      ipcRenderer.once(channel, (_event, ...args) => listener(...args))
    }
  },
}

// Expose to renderer via contextBridge (sandboxed, secure)
contextBridge.exposeInMainWorld('fluxAPI', api)

// TypeScript type declaration — matches the exposed API exactly
declare global {
  interface Window {
    fluxAPI: typeof api
  }
}
