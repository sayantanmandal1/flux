import { useSettingsStore } from '@renderer/stores/settings.store'
import { DEFAULT_SHORTCUTS } from '@shared/constants'

export function ShortcutsTab() {
  const { settings, updateSetting } = useSettingsStore()
  if (!settings) return null
  const shortcuts = settings.shortcuts

  const labels: Record<string, string> = {
    playPause: 'Play / Pause',
    seekForward: 'Seek +10s',
    seekBackward: 'Seek -10s',
    seekForwardLarge: 'Seek +60s',
    seekBackwardLarge: 'Seek -60s',
    volumeUp: 'Volume Up',
    volumeDown: 'Volume Down',
    mute: 'Toggle Mute',
    fullscreen: 'Fullscreen',
    nextFile: 'Next File',
    prevFile: 'Previous File',
    nextChapter: 'Next Chapter',
    prevChapter: 'Previous Chapter',
    frameStep: 'Frame Step',
    frameBackStep: 'Frame Back Step',
    speedUp: 'Speed Up',
    speedDown: 'Speed Down',
    resetSpeed: 'Reset Speed',
    screenshot: 'Screenshot',
    playlist: 'Toggle Playlist',
    subtitles: 'Toggle Subtitles',
    equalizer: 'Toggle Equalizer',
    mediaInfo: 'Media Info',
    openFile: 'Open File',
    openUrl: 'Open URL',
    abLoopA: 'Set A-B Loop A',
    abLoopB: 'Set A-B Loop B',
    abLoopClear: 'Clear A-B Loop',
    cycleAudioTrack: 'Cycle Audio Track',
    cycleSubTrack: 'Cycle Subtitle Track',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    resetZoom: 'Reset Zoom',
  }

  return (
    <div className="p-6">
      <p className="text-xs text-white/40 mb-4">
        Click a shortcut to reassign it. Press Escape to cancel.
      </p>
      <div className="space-y-0.5">
        {Object.entries(labels).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between py-2.5 border-b border-white/[0.04]">
            <span className="text-sm text-white/70">{label}</span>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 text-xs font-mono bg-white/[0.06] border border-white/10 rounded-lg text-white/60">
                {shortcuts[key] || DEFAULT_SHORTCUTS[key] || '—'}
              </kbd>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
