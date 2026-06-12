import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.fluxplayer.app',
  productName: 'FLUX',
  copyright: 'Copyright © 2024 sayantanmandal1',
  directories: {
    output: 'dist',
    buildResources: 'build',
  },
  files: [
    'out/**/*',
    // Note: resources (mpv, ffmpeg, yt-dlp) are handled by extraResources below,
    // NOT included here to avoid double-packing the binaries into asar.
    '!resources/**/*',
  ],
  extraResources: [
    {
      // Copy the entire resources/ folder directly into Electron's resources/ dir.
      // In the installed app: process.resourcesPath = <install>/resources/
      // So mpv.exe lands at: <install>/resources/mpv/mpv.exe  ✓
      from: 'resources',
      to: '.',
      filter: [
        '**/*',
        '!**/*.7z',
        '!**/*.zip',
        '!**/7za.exe',
        '!**/7z.dll',
        '!**/7za.chm',
      ],
    },
  ],
  asar: true,
  asarUnpack: [
    '**/node_modules/better-sqlite3/**/*',
    '**/node_modules/koffi/**/*',
    '**/node_modules/bindings/**/*',
  ],
  win: {
    target: [
      { target: 'nsis', arch: ['x64'] },
    ],
    icon: 'resources/icons/icon.png',
    artifactName: 'FLUX-Setup-${version}.exe',
    publisherName: 'sayantanmandal1',
    verifyUpdateCodeSignature: false,
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: true,
    installerIcon: 'resources/icons/icon.png',
    uninstallerIcon: 'resources/icons/icon.png',
    installerHeaderIcon: 'resources/icons/icon.png',
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'FLUX',
    include: 'build/installer.nsh',
    perMachine: false,
    deleteAppDataOnUninstall: false,
    menuCategory: 'FLUX',
    displayLanguageSelector: false,
    multiLanguageInstaller: false,
    warningsAsErrors: false,
    // Custom pages handled via include script
  },
  fileAssociations: [
    // Video
    { ext: ['mkv', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'ts', 'mts', 'm2ts', 'mpg', 'mpeg', 'm4v', 'vob', 'rmvb', 'rm', 'asf', '3gp', 'f4v', 'ogv', 'divx'], name: 'Video File', description: 'FLUX Video File', mimeType: 'video/*', role: 'Editor', isPackage: false },
    // Audio
    { ext: ['mp3', 'flac', 'aac', 'wav', 'ogg', 'opus', 'm4a', 'wma', 'ac3', 'dts', 'ape', 'alac', 'mka', 'tta', 'wv', 'aiff', 'aif'], name: 'Audio File', description: 'FLUX Audio File', mimeType: 'audio/*', role: 'Editor', isPackage: false },
  ],
  protocols: [
    { name: 'FLUX URL', schemes: ['flux'], role: 'Editor' },
  ],
  publish: {
    provider: 'github',
    owner: 'sayantanmandal1',
    repo: 'flux',
    releaseType: 'release',
  },
  mac: {
    // macOS support planned for future release
    disabled: true,
  } as Record<string, unknown>,
}

export default config