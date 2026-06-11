/**
 * Win32 window reparenting using koffi (native FFI).
 * Embeds mpv's native window into our child BrowserWindow after IPC connects.
 * This is the VLC approach: start player → get HWND → SetParent().
 */
import koffi from 'koffi'

// Lazy-load user32 so a load-time koffi error doesn't crash the main process
let user32Lib: ReturnType<typeof koffi.load> | null = null

function getUser32() {
  if (!user32Lib) user32Lib = koffi.load('user32.dll')
  return user32Lib
}

// koffi uses intptr_t for pointer-sized Windows handles (HWND, etc.)
let _fns: {
  IsWindow: (h: bigint) => number
  SetParent: (child: bigint, parent: bigint) => bigint
  GetWindowLong: (h: bigint, idx: number) => number
  SetWindowLong: (h: bigint, idx: number, val: number) => number
  SetWindowPos: (h: bigint, after: bigint, x: number, y: number, cx: number, cy: number, flags: number) => number
  ShowWindow: (h: bigint, cmd: number) => number
  MoveWindow: (h: bigint, x: number, y: number, w: number, h2: number, repaint: number) => number
} | null = null

function fns() {
  if (_fns) return _fns
  const u = getUser32()
  _fns = {
    IsWindow:      u.func('int __stdcall IsWindow(intptr_t hWnd)') as typeof _fns['IsWindow'],
    SetParent:     u.func('intptr_t __stdcall SetParent(intptr_t hWndChild, intptr_t hWndNewParent)') as typeof _fns['SetParent'],
    GetWindowLong: u.func('long __stdcall GetWindowLongW(intptr_t hWnd, int nIndex)') as typeof _fns['GetWindowLong'],
    SetWindowLong: u.func('long __stdcall SetWindowLongW(intptr_t hWnd, int nIndex, long dwNewLong)') as typeof _fns['SetWindowLong'],
    SetWindowPos:  u.func('int __stdcall SetWindowPos(intptr_t hWnd, intptr_t ins, int X, int Y, int cx, int cy, uint flags)') as typeof _fns['SetWindowPos'],
    ShowWindow:    u.func('int __stdcall ShowWindow(intptr_t hWnd, int nCmdShow)') as typeof _fns['ShowWindow'],
    MoveWindow:    u.func('int __stdcall MoveWindow(intptr_t hWnd, int X, int Y, int nWidth, int nHeight, int bRepaint)') as typeof _fns['MoveWindow'],
  }
  return _fns
}

const GWL_STYLE      = -16
const WS_CHILD       = 0x40000000
const WS_VISIBLE     = 0x10000000
const WS_POPUP       = 0x80000000
const SWP_NOZORDER   = 0x0004
const SWP_FRAMECHANGED = 0x0020
const SW_SHOW        = 5
const SW_HIDE        = 0

export function embedWindowIntoParent(
  childHwnd: number,
  parentHwnd: number,
  x: number, y: number, w: number, h: number
): boolean {
  try {
    const f = fns()
    const child  = BigInt(childHwnd)
    const parent = BigInt(parentHwnd)

    if (!f.IsWindow(child))  { console.error('[win32-embed] childHwnd invalid');  return false }
    if (!f.IsWindow(parent)) { console.error('[win32-embed] parentHwnd invalid'); return false }

    f.SetParent(child, parent)

    let style = f.GetWindowLong(child, GWL_STYLE)
    style = ((style & ~WS_POPUP) | WS_CHILD | WS_VISIBLE) >>> 0
    f.SetWindowLong(child, GWL_STYLE, style)

    f.SetWindowPos(child, 0n, x, y, Math.max(1, w), Math.max(1, h), SWP_NOZORDER | SWP_FRAMECHANGED)
    f.ShowWindow(child, SW_SHOW)

    console.log(`[win32-embed] Embedded HWND ${childHwnd} into ${parentHwnd} @ ${w}x${h}`)
    return true
  } catch (e) {
    console.error('[win32-embed] embedWindowIntoParent error:', (e as Error).message)
    return false
  }
}

export function resizeEmbeddedWindow(hwnd: number, w: number, h: number): void {
  try {
    fns().MoveWindow(BigInt(hwnd), 0, 0, Math.max(1, w), Math.max(1, h), 1)
  } catch { /* ignore */ }
}

export function detachWindow(hwnd: number): void {
  try {
    fns().ShowWindow(BigInt(hwnd), SW_HIDE)
  } catch { /* ignore */ }
}
