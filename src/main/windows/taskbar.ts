/**
 * Windows taskbar integration:
 * - Thumbnail toolbar (Prev / Play-Pause / Next buttons)
 * - Taskbar progress bar (playback progress + buffering indicator)
 * - Jump List (recent files + tasks)
 * - System Tray icon with context menu
 */
import {
  BrowserWindow,
  nativeImage,
  Tray,
  Menu,
  MenuItem,
  app,
  shell,
  NativeImage,
} from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'

let tray: Tray | null = null
let thumbnailToolbarSet = false

// ─── Thumbnail Toolbar ────────────────────────────────────────────────────────

export function setupThumbnailToolbar(
  win: BrowserWindow,
  handlers: {
    onPrev: () => void
    onPlayPause: () => void
    onNext: () => void
  }
): void {
  if (thumbnailToolbarSet) return
  thumbnailToolbarSet = true

  const iconDir = join(__dirname, '../../resources/icons')
  const makeIcon = (name: string): NativeImage => {
    const p = join(iconDir, `${name}.png`)
    if (existsSync(p)) return nativeImage.createFromPath(p)
    return nativeImage.createEmpty()
  }

  win.setThumbarButtons([
    {
      tooltip: 'Previous',
      icon: makeIcon('prev'),
      click: handlers.onPrev,
    },
    {
      tooltip: 'Play / Pause',
      icon: makeIcon('play'),
      flags: ['enabled'],
      click: handlers.onPlayPause,
    },
    {
      tooltip: 'Next',
      icon: makeIcon('next'),
      click: handlers.onNext,
    },
  ])
}

export function updateThumbnailPlayButton(win: BrowserWindow, isPlaying: boolean): void {
  const iconDir = join(__dirname, '../../resources/icons')
  const makeIcon = (name: string): NativeImage => {
    const p = join(iconDir, `${name}.png`)
    if (existsSync(p)) return nativeImage.createFromPath(p)
    return nativeImage.createEmpty()
  }

  win.setThumbarButtons([
    {
      tooltip: 'Previous',
      icon: makeIcon('prev'),
      click: (): void => { win.webContents.send('taskbar:prev') },
    },
    {
      tooltip: isPlaying ? 'Pause' : 'Play',
      icon: makeIcon(isPlaying ? 'pause' : 'play'),
      flags: ['enabled'],
      click: (): void => { win.webContents.send('taskbar:play-pause') },
    },
    {
      tooltip: 'Next',
      icon: makeIcon('next'),
      click: (): void => { win.webContents.send('taskbar:next') },
    },
  ])
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

export function setTaskbarProgress(win: BrowserWindow, progress: number): void {
  // progress: 0.0–1.0 = normal, -1 = remove, 2 = indeterminate
  if (progress < 0) {
    win.setProgressBar(-1)
  } else if (progress >= 2) {
    win.setProgressBar(2, { mode: 'indeterminate' })
  } else {
    win.setProgressBar(progress, { mode: 'normal' })
  }
}

// ─── Jump List ────────────────────────────────────────────────────────────────

export function updateJumpList(
  recentFiles: Array<{ path: string; title: string }>
): void {
  const exePath = process.execPath
  app.setJumpList([
    {
      type: 'tasks',
      items: [
        {
          type: 'task',
          title: 'Open File…',
          description: 'Open a media file',
          program: exePath,
          args: '--open-dialog',
          iconPath: exePath,
          iconIndex: 0,
        },
        {
          type: 'task',
          title: 'Open URL…',
          description: 'Stream from a URL',
          program: exePath,
          args: '--open-url',
          iconPath: exePath,
          iconIndex: 0,
        },
      ],
    },
    {
      type: 'custom',
      name: 'Recent',
      items: recentFiles.slice(0, 10).map((f) => ({
        type: 'file' as const,
        path: f.path,
      })),
    },
  ])
}

// ─── System Tray ──────────────────────────────────────────────────────────────

export function createTray(
  win: BrowserWindow,
  handlers: {
    onShow: () => void
    onPlayPause: () => void
    onNext: () => void
    onPrev: () => void
    onQuit: () => void
  }
): Tray {
  if (tray) {
    tray.destroy()
  }

  const iconPath = join(__dirname, '../../resources/icons/tray.png')
  const icon = existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty()

  tray = new Tray(icon)
  tray.setToolTip('FLUX — The Ultimate Media Player')

  const buildMenu = (nowPlaying?: string): Menu =>
    Menu.buildFromTemplate([
      {
        label: nowPlaying ? `▶  ${nowPlaying}` : 'FLUX Media Player',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Show / Hide',
        click: handlers.onShow,
      },
      { type: 'separator' },
      {
        label: 'Previous',
        click: handlers.onPrev,
        accelerator: '',
      },
      {
        label: 'Play / Pause',
        click: handlers.onPlayPause,
      },
      {
        label: 'Next',
        click: handlers.onNext,
      },
      { type: 'separator' },
      {
        label: 'Quit FLUX',
        click: handlers.onQuit,
      },
    ])

  tray.setContextMenu(buildMenu())

  tray.on('double-click', () => {
    if (win.isVisible()) {
      win.focus()
    } else {
      handlers.onShow()
    }
  })

  return tray
}

export function updateTrayMenu(nowPlaying?: string): void {
  if (!tray) return
  // We just update the tooltip
  if (nowPlaying) {
    tray.setToolTip(`FLUX — ${nowPlaying}`)
  }
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
