/**
 * MpvView — dedicated child BrowserWindow that mpv renders into.
 *
 * Started HIDDEN. Only made visible when mpv loads a file.
 * Hidden again when mpv goes idle, so the home screen is always visible.
 */
import { BrowserWindow } from 'electron'

let mpvView: BrowserWindow | null = null
let lastBounds: ViewBounds = { x: 0, y: 36, width: 800, height: 500 }

export interface ViewBounds {
  x: number
  y: number
  width: number
  height: number
}

export function createMpvView(parent: BrowserWindow): { window: BrowserWindow; hwnd: bigint } {
  if (mpvView && !mpvView.isDestroyed()) {
    mpvView.destroy()
  }

  mpvView = new BrowserWindow({
    parent,
    x: -32000,  // Start off-screen — revealed by showMpvView() after file loads
    y: -32000,
    width: 800,
    height: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#000000',
    show: true,              // Must be true so mpv's --wid target is a valid, visible HWND
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    title: '',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Load a minimal blank page — mpv replaces the window contents at the OS level
  mpvView.loadURL('data:text/html,<!DOCTYPE html><html style="background:#000;margin:0;overflow:hidden"><body style="background:#000;margin:0;padding:0"></body></html>')

  mpvView.on('closed', () => {
    mpvView = null
  })

  // Prevent the view from stealing focus or responding to user input
  mpvView.webContents.on('before-input-event', (e) => e.preventDefault())

  const hwndBuffer = mpvView.getNativeWindowHandle()
  const hwnd = hwndBuffer.readBigUInt64LE(0)

  // Do NOT call loadURL here.
  // If Chromium initializes a rendering pipeline in this window, it acquires the
  // DirectX swap chain — mpv then can't get exclusive GPU access to the same HWND
  // and hangs before creating the IPC pipe.
  // Leave this as a plain black native Win32 window. mpv will own it entirely.
  mpvView.webContents.on('before-input-event', (e) => e.preventDefault())

  console.log(`[MpvView] Created child window HWND: ${hwnd.toString()}`)
  return { window: mpvView, hwnd }
}

/**
 * Update stored bounds and reposition the window.
 * Call this every time VIDEO_AREA_BOUNDS is received.
 */
export function setMpvViewBounds(bounds: ViewBounds): void {
  lastBounds = bounds
  if (!mpvView || mpvView.isDestroyed()) return
  try {
    mpvView.setBounds({
      x: Math.max(0, Math.round(bounds.x)),
      y: Math.max(0, Math.round(bounds.y)),
      width: Math.max(1, Math.round(bounds.width)),
      height: Math.max(1, Math.round(bounds.height)),
    })
  } catch { /* ignore */ }
}

/**
 * Position to last known bounds and make visible.
 * Call when mpv starts playing a file.
 */
export function showMpvView(): void {
  if (!mpvView || mpvView.isDestroyed()) return
  try {
    mpvView.setBounds({
      x: Math.max(0, Math.round(lastBounds.x)),
      y: Math.max(0, Math.round(lastBounds.y)),
      width: Math.max(1, Math.round(lastBounds.width)),
      height: Math.max(1, Math.round(lastBounds.height)),
    })
  } catch { /* ignore */ }
  mpvView.show()
}

/** Hide the view — home screen / idle state becomes visible.
 *  We move it off-screen rather than hide() or resize to 1x1.
 *  Hiding makes mpv lose its rendering surface (code=0xFFFFFFFF crash).
 *  Moving off-screen keeps the HWND valid; mpv renders harmlessly off-screen.
 */
export function hideMpvView(): void {
  if (!mpvView || mpvView.isDestroyed()) return
  try {
    mpvView.setBounds({ x: -32000, y: -32000, width: 800, height: 600 })
  } catch { /* ignore */ }
}

export function destroyMpvView(): void {
  if (mpvView && !mpvView.isDestroyed()) mpvView.destroy()
  mpvView = null
}

export function isMpvViewAlive(): boolean {
  return !!mpvView && !mpvView.isDestroyed()
}

