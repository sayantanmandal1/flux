// Formats Chromium handles natively (no mpv needed)
// Kept in a separate file so React Fast Refresh works on PlayerEngineContext.tsx

export const HTML5_VIDEO_EXTS = new Set([
  'mp4', 'm4v', 'webm', 'ogv', 'ogg', 'mov', 'f4v',
])
export const HTML5_AUDIO_EXTS = new Set([
  'mp3', 'aac', 'm4a', 'oga', 'wav', 'wave', 'flac', 'opus', 'weba', 'aif', 'aiff',
])
export const HTML5_ALL_EXTS = new Set([...HTML5_VIDEO_EXTS, ...HTML5_AUDIO_EXTS])

export function isHtml5Compatible(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return HTML5_ALL_EXTS.has(ext)
}
