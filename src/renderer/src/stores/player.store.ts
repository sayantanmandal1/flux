import { create } from 'zustand'
import type { MediaTrack, Chapter, VideoParams, AudioParams } from '@shared/types'

interface PlayerStore {
  // File state
  filePath: string | null
  url: string | null
  mediaTitle: string
  fileName: string

  // Playback state
  isPlaying: boolean
  isIdle: boolean
  isBuffering: boolean
  duration: number
  position: number

  // Volume
  volume: number
  muted: boolean

  // Speed
  speed: number

  // Tracks
  tracks: MediaTrack[]
  activeAudioTrackId: number
  activeSubTrackId: number
  activeVideoTrackId: number

  // Chapters
  chapters: Chapter[]
  currentChapter: number

  // A-B Loop
  abLoopA: number | null
  abLoopB: number | null

  // Display
  isFullscreen: boolean
  isPip: boolean

  // Video metadata
  videoParams: VideoParams | null
  audioParams: AudioParams | null
  hwdecActive: boolean

  // Filters / adjustments
  brightness: number
  contrast: number
  saturation: number
  hue: number
  gamma: number

  // Aspect
  aspect: string

  // Zoom / Pan
  zoom: number
  panX: number
  panY: number

  // Delays
  audioDelay: number
  subDelay: number

  // Actions
  setFilePath: (path: string | null) => void
  setUrl: (url: string | null) => void
  setMediaTitle: (title: string) => void
  setPlaying: (playing: boolean) => void
  setIdle: (idle: boolean) => void
  setBuffering: (buffering: boolean) => void
  setDuration: (duration: number) => void
  setPosition: (position: number) => void
  setVolume: (volume: number) => void
  setMuted: (muted: boolean) => void
  setSpeed: (speed: number) => void
  setTracks: (tracks: MediaTrack[]) => void
  setActiveAudioTrack: (id: number) => void
  setActiveSubTrack: (id: number) => void
  setActiveVideoTrack: (id: number) => void
  setChapters: (chapters: Chapter[]) => void
  setCurrentChapter: (idx: number) => void
  setAbLoopA: (time: number | null) => void
  setAbLoopB: (time: number | null) => void
  setFullscreen: (fs: boolean) => void
  setPip: (pip: boolean) => void
  setVideoParams: (params: VideoParams | null) => void
  setAudioParams: (params: AudioParams | null) => void
  setHwdecActive: (active: boolean) => void
  setBrightness: (val: number) => void
  setContrast: (val: number) => void
  setSaturation: (val: number) => void
  setHue: (val: number) => void
  setGamma: (val: number) => void
  setAspect: (aspect: string) => void
  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void
  setAudioDelay: (delay: number) => void
  setSubDelay: (delay: number) => void
  applyStateUpdate: (update: Partial<PlayerStore>) => void
  reset: () => void
}

const initialState = {
  filePath: null,
  url: null,
  mediaTitle: '',
  fileName: '',
  isPlaying: false,
  isIdle: true,
  isBuffering: false,
  duration: 0,
  position: 0,
  volume: 100,
  muted: false,
  speed: 1.0,
  tracks: [],
  activeAudioTrackId: 1,
  activeSubTrackId: 0,
  activeVideoTrackId: 1,
  chapters: [],
  currentChapter: -1,
  abLoopA: null,
  abLoopB: null,
  isFullscreen: false,
  isPip: false,
  videoParams: null,
  audioParams: null,
  hwdecActive: false,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  gamma: 0,
  aspect: '',
  zoom: 0,
  panX: 0,
  panY: 0,
  audioDelay: 0,
  subDelay: 0,
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  ...initialState,

  setFilePath: (path) => set({ filePath: path }),
  setUrl: (url) => set({ url }),
  setMediaTitle: (title) => set({ mediaTitle: title }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setIdle: (isIdle) => set({ isIdle }),
  setBuffering: (isBuffering) => set({ isBuffering }),
  setDuration: (duration) => set({ duration }),
  setPosition: (position) => set({ position }),
  setVolume: (volume) => set({ volume }),
  setMuted: (muted) => set({ muted }),
  setSpeed: (speed) => set({ speed }),
  setTracks: (tracks) => set({ tracks }),
  setActiveAudioTrack: (id) => set({ activeAudioTrackId: id }),
  setActiveSubTrack: (id) => set({ activeSubTrackId: id }),
  setActiveVideoTrack: (id) => set({ activeVideoTrackId: id }),
  setChapters: (chapters) => set({ chapters }),
  setCurrentChapter: (idx) => set({ currentChapter: idx }),
  setAbLoopA: (time) => set({ abLoopA: time }),
  setAbLoopB: (time) => set({ abLoopB: time }),
  setFullscreen: (isFullscreen) => set({ isFullscreen }),
  setPip: (isPip) => set({ isPip }),
  setVideoParams: (videoParams) => set({ videoParams }),
  setAudioParams: (audioParams) => set({ audioParams }),
  setHwdecActive: (hwdecActive) => set({ hwdecActive }),
  setBrightness: (brightness) => set({ brightness }),
  setContrast: (contrast) => set({ contrast }),
  setSaturation: (saturation) => set({ saturation }),
  setHue: (hue) => set({ hue }),
  setGamma: (gamma) => set({ gamma }),
  setAspect: (aspect) => set({ aspect }),
  setZoom: (zoom) => set({ zoom }),
  setPan: (panX, panY) => set({ panX, panY }),
  setAudioDelay: (audioDelay) => set({ audioDelay }),
  setSubDelay: (subDelay) => set({ subDelay }),

  applyStateUpdate: (update) => set((state) => ({ ...state, ...update })),
  reset: () => set(initialState),
}))
