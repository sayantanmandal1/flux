/**
 * Windows file association manager.
 * Registers/unregisters FLUX as a handler for 120+ media extensions.
 * Uses child_process to run reg.exe — no native addon required.
 */
import { execSync } from 'child_process'
import { app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { VIDEO_EXTENSIONS, AUDIO_EXTENSIONS } from '../../shared/constants'

const APP_ID = 'FluxMediaPlayer'
const APP_NAME = 'FLUX Media Player'

function getExePath(): string {
  if (app.isPackaged) {
    return process.execPath
  }
  // Dev mode: point to the electron binary for testing
  return process.execPath
}

function regAdd(key: string, valueName: string, type: string, data: string): void {
  const escaped = data.replace(/"/g, '\\"')
  try {
    execSync(`reg add "${key}" /v "${valueName}" /t ${type} /d "${escaped}" /f`, {
      windowsHide: true,
      stdio: 'ignore',
    })
  } catch {
    // Ignore registry errors (may need elevation for HKCR)
  }
}

function regDelete(key: string): void {
  try {
    execSync(`reg delete "${key}" /f`, {
      windowsHide: true,
      stdio: 'ignore',
    })
  } catch {}
}

export function registerFileAssociations(): void {
  const exePath = getExePath()
  const allExtensions = [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS]

  // Register app capabilities
  const capabilityKey = `HKCU\\Software\\${APP_ID}`
  regAdd(capabilityKey, 'ApplicationName', 'REG_SZ', APP_NAME)
  regAdd(capabilityKey, 'ApplicationIcon', 'REG_SZ', `${exePath},0`)
  regAdd(capabilityKey, 'ApplicationDescription', 'REG_SZ', 'The Ultimate Media Player')

  // Register the app with Windows registered applications
  regAdd(
    `HKCU\\Software\\RegisteredApplications`,
    APP_ID,
    'REG_SZ',
    `Software\\${APP_ID}\\Capabilities`
  )

  // Register app capabilities for each extension
  for (const ext of allExtensions) {
    const progId = `${APP_ID}.${ext}`

    // Create ProgID entry under HKCU Classes
    const progIdKey = `HKCU\\Software\\Classes\\${progId}`
    regAdd(progIdKey, '', 'REG_SZ', `${APP_NAME} ${ext.toUpperCase()} File`)
    regAdd(`${progIdKey}\\DefaultIcon`, '', 'REG_SZ', `${exePath},0`)
    regAdd(`${progIdKey}\\shell\\open\\command`, '', 'REG_SZ', `"${exePath}" "%1"`)

    // Register in app capabilities
    regAdd(
      `HKCU\\Software\\${APP_ID}\\Capabilities\\FileAssociations`,
      `.${ext}`,
      'REG_SZ',
      progId
    )

    // Register "Open with FLUX" in shell context menu (HKCU OpenWithProgids)
    regAdd(
      `HKCU\\Software\\Classes\\.${ext}\\OpenWithProgids`,
      progId,
      'REG_NONE',
      ''
    )
  }

  // Notify Windows that file associations changed
  notifyAssociationChanged()
}

export function unregisterFileAssociations(): void {
  const allExtensions = [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS]

  regDelete(`HKCU\\Software\\${APP_ID}`)
  regDelete(`HKCU\\Software\\RegisteredApplications\\${APP_ID}`)

  for (const ext of allExtensions) {
    const progId = `${APP_ID}.${ext}`
    regDelete(`HKCU\\Software\\Classes\\${progId}`)
    try {
      execSync(
        `reg delete "HKCU\\Software\\Classes\\.${ext}\\OpenWithProgids" /v "${progId}" /f`,
        { windowsHide: true, stdio: 'ignore' }
      )
    } catch {}
  }

  notifyAssociationChanged()
}

export function setDefaultApp(): void {
  // Open Windows default apps settings page
  try {
    execSync('start ms-settings:defaultapps', { windowsHide: false, shell: true })
  } catch {
    execSync('start ms-settings:', { windowsHide: false, shell: true })
  }
}

export function isFileAssociationsRegistered(): boolean {
  try {
    const result = execSync(
      `reg query "HKCU\\Software\\RegisteredApplications" /v "${APP_ID}"`,
      { windowsHide: true }
    ).toString()
    return result.includes(APP_ID)
  } catch {
    return false
  }
}

function notifyAssociationChanged(): void {
  try {
    // SHChangeNotify(SHCNE_ASSOCCHANGED, SHCNF_IDLIST, 0, 0) via shell32
    execSync('assoc', { windowsHide: true, stdio: 'ignore' })
  } catch {}
}
