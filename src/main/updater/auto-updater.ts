import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'
import { IPC } from '../../shared/types'

export function setupAutoUpdater(win: BrowserWindow): void {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    win.webContents.send(IPC.UPDATE_AVAILABLE, {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate,
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    win.webContents.send(IPC.UPDATE_PROGRESS, {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    win.webContents.send(IPC.UPDATE_DOWNLOADED, {
      version: info.version,
    })
  })

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] error:', err)
  })

  // Check for updates 5s after launch
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 5000)
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall(false, true)
}
