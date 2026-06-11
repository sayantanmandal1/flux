export const APP_NAME = 'FLUX'
export const APP_VERSION = '1.0.0'
export const APP_ID = 'com.fluxplayer.app'
export const APP_WEBSITE = 'https://fluxplayer.app'
export const GITHUB_REPO = 'sayantanmandal1/flux'
export const UPDATE_SERVER = `https://github.com/${GITHUB_REPO}/releases/latest`

export const MPV_PIPE_NAME = 'flux-mpv'
export const MPV_PIPE_PATH = '\\\\.\\pipe\\flux-mpv'

// All supported media extensions
export const VIDEO_EXTENSIONS = [
  '3g2', '3gp', '3gpp', '3gpp2',
  'amv', 'asf', 'asx',
  'avi', 'avs', 'avchd',
  'bik', 'bk2',
  'cpk', 'cri',
  'divx', 'drc', 'dv', 'dvr-ms',
  'f4p', 'f4v', 'flv',
  'gxf',
  'h264', 'h265', 'hevc',
  'ifo', 'iso', 'ivf',
  'm1v', 'm2p', 'm2t', 'm2ts', 'm2v', 'm4b', 'm4p', 'm4v',
  'mkv', 'mov', 'movie',
  'mp2', 'mp2v', 'mp4', 'mp4v', 'mpe', 'mpeg', 'mpeg1', 'mpeg2', 'mpeg4', 'mpg', 'mpv', 'mpv2',
  'mts', 'mxf', 'mxg',
  'nsv', 'nuv',
  'ogg', 'ogm', 'ogv',
  'ps',
  'qt',
  'rec',
  'rm', 'rmvb', 'roq',
  'smk', 'svi',
  'swf',
  'tod', 'tp', 'trp', 'ts',
  'vfw', 'vob', 'vp9',
  'webm', 'wmv', 'wmx', 'wvx',
  'xvid',
  'y4m', 'yuv',
] as const

export const AUDIO_EXTENSIONS = [
  '3ga',
  'aa', 'aac', 'aax', 'ac3', 'acm', 'aif', 'aifc', 'aiff', 'alac', 'amr', 'ape', 'aptx',
  'au', 'aup',
  'caf',
  'dts', 'dtshd', 'dts-hd',
  'eac3', 'ec3',
  'f4a', 'flac',
  'gsm',
  'it',
  'm2a', 'm3u', 'm3u8', 'm4a', 'm4b', 'm4r',
  'mid', 'midi', 'mka', 'mlp', 'mod', 'mp1', 'mp2', 'mp3', 'mpa', 'mpc', 'mpga',
  'oga', 'ogg', 'opus',
  'pls',
  'ra', 'rax', 'rm',
  's3m', 'snd', 'spc', 'spx',
  'tak', 'tta', 'thd', 'truehd',
  'voc', 'vqf',
  'w64', 'wav', 'weba', 'webm', 'wma', 'wv', 'wvp',
  'xm', 'xmf',
] as const

export const SUBTITLE_EXTENSIONS = [
  'ass', 'idx', 'smi', 'srt', 'ssa', 'sub', 'sup', 'usf', 'vtt'
] as const

export const ALL_MEDIA_EXTENSIONS = [
  ...VIDEO_EXTENSIONS,
  ...AUDIO_EXTENSIONS,
] as const

// Equalizer band center frequencies (Hz)
export const EQ_BANDS = [25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000, 16000]

export const EQ_PRESETS = {
  Flat:         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [8, 7, 6, 5, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Treble Boost': [0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 5, 6, 7, 8],
  Vocal:        [-3, -2, 0, 2, 4, 5, 5, 4, 3, 2, 1, 0, 0, -1, -2],
  Cinema:       [3, 2, 1, 0, -1, 0, 0, 0, 1, 2, 3, 3, 2, 1, 0],
  Rock:         [5, 4, 3, 1, -1, -2, -1, 1, 3, 4, 5, 5, 4, 3, 2],
  Pop:          [-1, -1, 0, 2, 4, 4, 2, 0, -1, -1, -1, -1, -1, -2, -2],
  Classical:    [4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 5],
  Electronic:   [5, 4, 2, 0, -2, 1, 3, 2, 0, 0, 2, 3, 4, 4, 5],
  Headphones:   [3, 2, 1, 0, 0, -1, -1, -1, 0, 1, 2, 3, 3, 3, 4],
} as const

export const SPEED_PRESETS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 3.0, 4.0, 8.0, 10.0]

export const ASPECT_RATIOS = [
  { label: 'Original', value: '' },
  { label: '4:3', value: '4:3' },
  { label: '16:9', value: '16:9' },
  { label: '16:10', value: '16:10' },
  { label: '21:9', value: '21:9' },
  { label: '2.35:1', value: '2.35:1' },
  { label: '2.40:1', value: '2.40:1' },
  { label: '1:1', value: '1:1' },
  { label: 'Fill', value: 'fill' },
]

export const DEFAULT_SHORTCUTS: Record<string, string> = {
  playPause: 'Space',
  seekForward: 'ArrowRight',
  seekBackward: 'ArrowLeft',
  seekForwardLarge: 'Shift+ArrowRight',
  seekBackwardLarge: 'Shift+ArrowLeft',
  volumeUp: 'ArrowUp',
  volumeDown: 'ArrowDown',
  mute: 'M',
  fullscreen: 'F',
  nextFile: 'N',
  prevFile: 'P',
  nextChapter: 'PageDown',
  prevChapter: 'PageUp',
  frameStep: 'Period',
  frameBackStep: 'Comma',
  speedUp: ']',
  speedDown: '[',
  resetSpeed: '=',
  screenshot: 'S',
  playlist: 'L',
  subtitles: 'U',
  equalizer: 'E',
  mediaInfo: 'I',
  openFile: 'Ctrl+O',
  openUrl: 'Ctrl+U',
  pip: 'Ctrl+P',
  miniPlayer: 'Ctrl+M',
  abLoopA: 'A',
  abLoopB: 'B',
  abLoopClear: 'Ctrl+A',
  cycleAudioTrack: 'Ctrl+ArrowRight',
  cycleSubTrack: 'Ctrl+S',
  increaseSubDelay: 'H',
  decreaseSubDelay: 'G',
  increaseAudioDelay: 'Ctrl+H',
  decreaseAudioDelay: 'Ctrl+G',
  deinterlace: 'D',
  zoomIn: 'Ctrl+=',
  zoomOut: 'Ctrl+-',
  resetZoom: 'Ctrl+0',
}
