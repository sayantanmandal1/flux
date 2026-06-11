/**
 * NativeVideoWindow — WS_CHILD window for mpv --wid embedding.
 *
 * Uses the system "EDIT" window class — unlike STATIC, EDIT does not have
 * a GDI WM_PAINT implementation that would paint over D3D surfaces.
 * mpv completely takes over the window surface via DirectX.
 *
 * This is a well-known technique used in many open-source media players
 * when a custom class is impractical.
 */
import koffi from 'koffi'

const WS_CHILD        = 0x40000000
const WS_CLIPSIBLINGS = 0x04000000
const WS_CLIPCHILDREN = 0x02000000
const SW_SHOW         = 5
const SW_HIDE         = 0
const SWP_NOMOVE      = 0x0002
const SWP_NOSIZE      = 0x0001
const HWND_TOP        = 0n

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any

let user32Lib: ReturnType<typeof koffi.load> | null = null
function getUser32() {
  if (!user32Lib) user32Lib = koffi.load('user32.dll')
  return user32Lib
}

let _fns: {
  CreateWindowExA: AnyFn
  MoveWindow: AnyFn
  ShowWindow: AnyFn
  DestroyWindow: AnyFn
  SetWindowPos: AnyFn
} | null = null

function fns() {
  if (_fns) return _fns
  const u = getUser32()
  _fns = {
    CreateWindowExA: u.func('intptr_t __stdcall CreateWindowExA(uint dwExStyle, str lpClassName, str lpWindowName, uint dwStyle, int X, int Y, int nWidth, int nHeight, intptr_t hWndParent, intptr_t hMenu, intptr_t hInstance, intptr_t lpParam)'),
    MoveWindow:      u.func('int __stdcall MoveWindow(intptr_t hWnd, int X, int Y, int nWidth, int nHeight, int bRepaint)'),
    ShowWindow:      u.func('int __stdcall ShowWindow(intptr_t hWnd, int nCmdShow)'),
    DestroyWindow:   u.func('int __stdcall DestroyWindow(intptr_t hWnd)'),
    SetWindowPos:    u.func('int __stdcall SetWindowPos(intptr_t hWnd, intptr_t hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags)'),
  }
  return _fns
}

let videoHwnd: bigint | null = null

/**
 * Create a WS_CHILD video surface window inside the main Electron window.
 * Uses the "EDIT" window class — it does not GDI-paint over D3D surfaces.
 */
export function createNativeVideoWindow(
  parentHwnd: bigint,
  x: number, y: number, w: number, h: number
): bigint | null {
  try {
    const f = fns()
    // WS_CHILD | WS_CLIPSIBLINGS | WS_CLIPCHILDREN (hidden — no WS_VISIBLE yet)
    const style = (WS_CHILD | WS_CLIPSIBLINGS | WS_CLIPCHILDREN) >>> 0

    const hwndRaw = f.CreateWindowExA(
      0,       // dwExStyle
      'EDIT',  // EDIT class: no WM_PAINT GDI fill; D3D renders freely
      '',      // no text
      style,
      Math.round(x), Math.round(y),
      Math.max(1, Math.round(w)), Math.max(1, Math.round(h)),
      parentHwnd,
      0, 0, 0
    )

    const hwnd = BigInt(hwndRaw ?? 0)
    if (hwnd === 0n) {
      console.error('[NativeVideoWindow] CreateWindowExA returned 0')
      return null
    }

    videoHwnd = hwnd
    console.log(`[NativeVideoWindow] Created WS_CHILD HWND ${videoHwnd} (EDIT class) inside parent ${parentHwnd}`)
    return videoHwnd
  } catch (e) {
    console.error('[NativeVideoWindow] Create failed:', (e as Error).message)
    return null
  }
}

export function moveNativeVideoWindow(x: number, y: number, w: number, h: number): void {
  if (!videoHwnd) return
  try {
    fns().MoveWindow(videoHwnd, Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)), 1)
  } catch { /* ignore */ }
}

export function showNativeVideoWindow(): void {
  if (!videoHwnd) return
  try {
    fns().ShowWindow(videoHwnd, SW_SHOW)
    fns().SetWindowPos(videoHwnd, HWND_TOP, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE)
  } catch { /* ignore */ }
}

export function hideNativeVideoWindow(): void {
  if (!videoHwnd) return
  try { fns().ShowWindow(videoHwnd, SW_HIDE) } catch { /* ignore */ }
}

export function destroyNativeVideoWindow(): void {
  if (!videoHwnd) return
  try { fns().DestroyWindow(videoHwnd) } catch { /* ignore */ }
  videoHwnd = null
}

export function getNativeVideoHwnd(): bigint | null { return videoHwnd }
export function isNativeVideoWindowValid(): boolean { return !!videoHwnd }

