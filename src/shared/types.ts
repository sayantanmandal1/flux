// ─── Media Track ─────────────────────────────────────────────────────────────
export interface MediaTrack {
  id: number
  type: 'video' | 'audio' | 'sub'
  title?: string
  lang?: string
  codec?: string
  default?: boolean
  forced?: boolean
  external?: boolean
  externalFilename?: string
  selected?: boolean
}

// ─── Chapter ─────────────────────────────────────────────────────────────────
export interface Chapter {
  title: string
  time: number
}

// ─── Player State ─────────────────────────────────────────────────────────────
export interface PlayerState {
  filePath: string | null
  url: string | null
  title: string
  isPlaying: boolean
  isIdle: boolean
  isBuffering: boolean
  duration: number
  position: number
  volume: number
  muted: boolean
  speed: number
  tracks: MediaTrack[]
  chapters: Chapter[]
  activeAudioTrackId: number
  activeSubTrackId: number
  activeVideoTrackId: number
  abLoopA: number | null
  abLoopB: number | null
  isFullscreen: boolean
  isPip: boolean
  videoWidth: number
  videoHeight: number
  fps: number
  hwdecActive: boolean
  mediaTitle: string
  videoParams: VideoParams | null
  audioParams: AudioParams | null
}

export interface VideoParams {
  codec: string
  w: number
  h: number
  aspect: number
  fps: number
  bitrate?: number
  colorspace?: string
  pixelFormat?: string
  hdrType?: string
}

export interface AudioParams {
  codec: string
  samplerate: number
  channels: number
  bitrate?: number
}

// ─── Media Library Item ──────────────────────────────────────────────────────
export interface MediaItem {
  id: number
  filePath: string
  fileName: string
  title: string
  duration: number
  size: number
  width?: number
  height?: number
  fps?: number
  videoCodec?: string
  audioCodec?: string
  bitrate?: number
  coverArtPath?: string
  artist?: string
  album?: string
  year?: number
  type: 'video' | 'audio'
  addedAt: number
  watchedAt?: number
  watchedPercent?: number
}

// ─── Playlist Item ───────────────────────────────────────────────────────────
export interface PlaylistItem {
  id: string
  filePath?: string
  url?: string
  title: string
  duration?: number
  isCurrent?: boolean
}

// ─── Settings ────────────────────────────────────────────────────────────────
export interface AppSettings {
  general: GeneralSettings
  playback: PlaybackSettings
  audio: AudioSettings
  video: VideoSettings
  subtitles: SubtitleSettings
  shortcuts: Record<string, string>
  library: LibrarySettings
  integrations: IntegrationSettings
}

export interface GeneralSettings {
  theme: 'dark' | 'system'
  language: string
  resumePlayback: boolean
  rememberVolume: boolean
  startMinimized: boolean
  minimizeToTray: boolean
  closeToTray: boolean
  autoCheckUpdates: boolean
  screenshotPath: string
  screenshotFormat: 'png' | 'jpg' | 'webp'
  openLastFile: boolean
  recentFilesCount: number
}

export interface PlaybackSettings {
  defaultSpeed: number
  defaultVolume: number
  pauseOnMinimize: boolean
  pauseOnFocusLost: boolean
  skipSeconds: number
  bigSkipSeconds: number
  loopMode: 'none' | 'one' | 'all'
  shuffleMode: boolean
  hardwareDecoding: 'auto' | 'yes' | 'no'
}

export interface AudioSettings {
  defaultTrackLang: string
  volumeBoost: number
  normalizeAudio: boolean
  audioDelay: number
  equalizer: number[]
  equalizerPreset: string
  equalizerEnabled: boolean
}

export interface VideoSettings {
  defaultAspect: string
  interpolation: boolean
  deinterlace: 'auto' | 'yes' | 'no'
  vo: string
  gpuApi: string
  brightness: number
  contrast: number
  saturation: number
  hue: number
  gamma: number
  denoise: number
  sharpen: number
  hdrToneMapping: boolean
}

export interface SubtitleSettings {
  defaultTrackLang: string
  fontName: string
  fontSize: number
  color: string
  borderColor: string
  borderSize: number
  subtitleDelay: number
  autoLoad: boolean
  subtitlePath: string
  openSubtitlesApiKey: string
}

export interface LibrarySettings {
  watchFolders: string[]
  autoScan: boolean
  scanOnStartup: boolean
  thumbnailsEnabled: boolean
}

export interface IntegrationSettings {
  fileAssociationsRegistered: boolean
  contextMenuRegistered: boolean
  startWithWindows: boolean
}

// ─── Equalizer Preset ────────────────────────────────────────────────────────
export interface EqualizerPreset {
  name: string
  bands: number[] // 15 bands: 25Hz to 16kHz, dB values -20 to +20
}

// ─── Recent File ─────────────────────────────────────────────────────────────
export interface RecentFile {
  path: string
  title: string
  watchedAt: number
  watchedPercent: number
  duration: number
  thumbnail?: string
}

// ─── Subtitle Search Result ──────────────────────────────────────────────────
export interface SubtitleSearchResult {
  id: string
  language: string
  languageCode: string
  releaseName: string
  fileName: string
  downloadCount: number
  rating: number
  downloadUrl: string
}

// ─── Media Info ──────────────────────────────────────────────────────────────
export interface MediaInfo {
  format: string
  duration: number
  size: number
  bitrate: number
  streams: MediaStream[]
}

export interface MediaStream {
  index: number
  codecName: string
  codecLongName: string
  profileName?: string
  type: 'video' | 'audio' | 'subtitle' | 'data'
  width?: number
  height?: number
  frameRate?: string
  bitrate?: number
  sampleRate?: number
  channels?: number
  channelLayout?: string
  language?: string
  title?: string
  colorSpace?: string
  colorRange?: string
  colorTransfer?: string
  colorPrimaries?: string
  pixFmt?: string
  level?: number
}

// ─── IPC Channel Names ───────────────────────────────────────────────────────
export const IPC = {
  // Player commands (renderer → main)
  LOAD_FILE: 'player:load-file',
  LOAD_URL: 'player:load-url',
  PLAY_PAUSE: 'player:play-pause',
  STOP: 'player:stop',
  SEEK: 'player:seek',
  SEEK_RELATIVE: 'player:seek-relative',
  SET_VOLUME: 'player:set-volume',
  SET_MUTED: 'player:set-muted',
  SET_SPEED: 'player:set-speed',
  SET_AUDIO_TRACK: 'player:set-audio-track',
  SET_SUB_TRACK: 'player:set-sub-track',
  SET_VIDEO_TRACK: 'player:set-video-track',
  SET_AUDIO_DELAY: 'player:set-audio-delay',
  SET_SUB_DELAY: 'player:set-sub-delay',
  SET_ASPECT: 'player:set-aspect',
  SET_EQUALIZER: 'player:set-equalizer',
  SET_EQUALIZER_ENABLED: 'player:set-equalizer-enabled',
  SET_VIDEO_FILTER: 'player:set-video-filter',
  SET_COLOR: 'player:set-color',
  SET_AB_LOOP_A: 'player:set-ab-loop-a',
  SET_AB_LOOP_B: 'player:set-ab-loop-b',
  CLEAR_AB_LOOP: 'player:clear-ab-loop',
  FRAME_STEP: 'player:frame-step',
  FRAME_BACK_STEP: 'player:frame-back-step',
  TAKE_SCREENSHOT: 'player:take-screenshot',
  SET_FULLSCREEN: 'player:set-fullscreen',
  SET_PIP: 'player:set-pip',
  NEXT_CHAPTER: 'player:next-chapter',
  PREV_CHAPTER: 'player:prev-chapter',
  SEEK_CHAPTER: 'player:seek-chapter',
  ADD_SUBTITLE_FILE: 'player:add-subtitle-file',
  LOAD_NEXT: 'player:load-next',
  LOAD_PREV: 'player:load-prev',
  ZOOM: 'player:zoom',
  PAN: 'player:pan',
  MPV_COMMAND: 'player:mpv-command',

  // Player state events (main → renderer)
  STATE_UPDATE: 'player:state-update',
  POSITION_UPDATE: 'player:position-update',
  EOF: 'player:eof',
  FILE_LOADED: 'player:file-loaded',
  TRACKS_CHANGED: 'player:tracks-changed',
  CHAPTERS_CHANGED: 'player:chapters-changed',
  MPV_ERROR: 'player:mpv-error',

  // Window commands
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:is-maximized',
  WINDOW_RESIZE_FOR_VIDEO: 'window:resize-for-video',
  VIDEO_AREA_BOUNDS: 'window:video-area-bounds',

  // Dialog / file commands
  OPEN_FILE_DIALOG: 'dialog:open-file',
  OPEN_FOLDER_DIALOG: 'dialog:open-folder',
  OPEN_SUBTITLE_DIALOG: 'dialog:open-subtitle',

  // Library commands
  LIBRARY_GET_ALL: 'library:get-all',
  LIBRARY_GET_RECENT: 'library:get-recent',
  LIBRARY_SCAN_FOLDER: 'library:scan-folder',
  LIBRARY_ADD_FOLDER: 'library:add-folder',
  LIBRARY_REMOVE_ITEM: 'library:remove-item',
  LIBRARY_GET_MEDIA_INFO: 'library:get-media-info',
  LIBRARY_UPDATE_PROGRESS: 'library:update-progress',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_RESET: 'settings:reset',

  // File associations / integrations
  REGISTER_FILE_ASSOCIATIONS: 'integration:register-file-associations',
  UNREGISTER_FILE_ASSOCIATIONS: 'integration:unregister-file-associations',
  SET_AS_DEFAULT_APP: 'integration:set-as-default',
  SET_START_WITH_WINDOWS: 'integration:set-start-with-windows',

  // Updates
  CHECK_UPDATE: 'updater:check',
  INSTALL_UPDATE: 'updater:install',
  UPDATE_AVAILABLE: 'updater:available',
  UPDATE_PROGRESS: 'updater:progress',
  UPDATE_DOWNLOADED: 'updater:downloaded',

  // Subtitle search
  SUBTITLE_SEARCH: 'subtitle:search',
  SUBTITLE_DOWNLOAD: 'subtitle:download',

  // App info
  GET_APP_VERSION: 'app:get-version',
  GET_PATHS: 'app:get-paths',

  // Bookmark / resume
  SAVE_BOOKMARK: 'bookmark:save',
  GET_BOOKMARK: 'bookmark:get',
  DELETE_BOOKMARK: 'bookmark:delete',

  // Tray / notification
  NOW_PLAYING: 'tray:now-playing',
  MPV_VIEW_SHOW: 'mpv-view:show',
  MPV_VIEW_HIDE: 'mpv-view:hide',
} as const

export type IpcChannel = typeof IPC[keyof typeof IPC]
