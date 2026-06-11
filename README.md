# FLUX — The Ultimate Media Player

> **Play Everything. Perfectly.**

A production-grade Windows media player built with Electron, mpv, FFmpeg, and yt-dlp. Surpasses VLC in format support, features, and integration.

[![Build Status](https://github.com/sayantanmandal1/flux/actions/workflows/build.yml/badge.svg)](https://github.com/sayantanmandal1/flux/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows%2010%2F11-blue)](https://github.com/sayantanmandal1/flux/releases)

---

## Download

**[⬇ Download FLUX for Windows](https://github.com/sayantanmandal1/flux/releases/latest)**

---

## Features

- **120+ media formats** via mpv + FFmpeg — MKV, MP4, AVI, MOV, WMV, WebM, TS, VOB, RM, and more
- **All audio codecs** — MP3, FLAC, AAC, Opus, Vorbis, WMA, AC3, DTS, TrueHD, ALAC, APE, and more
- **Hardware acceleration** — D3D11VA/DXVA2 auto-detected, falls back to software
- **yt-dlp streaming** — YouTube, Twitch, Vimeo, and 1000+ sites
- **15-band equalizer** with presets
- **Subtitle support** — SRT, ASS, VTT, embedded tracks, OpenSubtitles API download
- **Windows integration** — file associations, taskbar thumbnail toolbar, jump list, system tray
- **Auto-updater** — silent background updates from GitHub Releases
- **HDR tone mapping**, A-B loop, frame stepping, screenshot capture
- **Media library** with metadata, cover art, watch progress

## Tech Stack

| Layer | Technology |
|---|---|
| Shell | Electron 32 |
| Renderer | React 18 + TypeScript + Vite |
| Media Engine | **mpv** (bundled) via Win32 named pipe IPC |
| Codec Library | **FFmpeg** (bundled, full GPL build) |
| Streaming | **yt-dlp** (bundled) |
| Video Surface | Native Win32 `WS_CHILD` window via koffi |
| Database | better-sqlite3 (media library, bookmarks) |
| Installer | electron-builder NSIS |
| Auto-update | electron-updater → GitHub Releases |
| Styling | Tailwind CSS v3 + glassmorphic design |

## Development Setup

### Prerequisites
- Node.js 18+
- Windows 10/11 x64
- 7-Zip (for extracting mpv archive)

### Install & Run

```bash
# Clone
git clone https://github.com/sayantanmandal1/flux.git
cd flux

# Install dependencies
npm install --ignore-scripts

# Download binary resources (mpv, ffmpeg, yt-dlp) ~350MB
node scripts/download-resources.cjs

# Start development server
npm run dev
```

### Build Installer

```bash
npm run build:win
# Output: dist/FLUX-Setup-{version}.exe
```

## Architecture

```
src/
├── main/                   Main process (Node.js)
│   ├── index.ts            Entry — BrowserWindow, IPC, Windows APIs
│   ├── mpv/
│   │   ├── mpv-manager.ts  mpv subprocess + named pipe JSON IPC
│   │   └── pipe-client.ts  Windows named pipe client
│   ├── windows/
│   │   ├── native-video-window.ts  Native WS_CHILD window for mpv --wid
│   │   ├── taskbar.ts              Taskbar toolbar, jump list, tray
│   │   └── file-associations.ts   Registry file type registration
│   └── library/
│       ├── media-db.ts     SQLite media library
│       └── media-scanner.ts  ffprobe metadata scanner
├── preload/
│   └── index.ts            contextBridge IPC API (secure renderer bridge)
├── renderer/src/           React application
│   ├── components/Player/  TitleBar, Controls, ProgressBar, VideoContainer
│   ├── components/Panels/  Equalizer, Subtitles, Filters, Chapters, Playlist
│   ├── stores/             Zustand state (player, library, ui, settings)
│   └── contexts/           PlayerEngineContext (mpv routing)
└── shared/
    ├── types.ts            IPC channel names, TypeScript types
    └── constants.ts        Media extensions, EQ presets, shortcuts
```

## Binary Resources

Run `npm run download-resources` to fetch:

| Binary | Source |
|--------|--------|
| `resources/mpv/mpv.exe` | [zhongfly/mpv-winbuild](https://github.com/zhongfly/mpv-winbuild) |
| `resources/ffmpeg/ffmpeg.exe` | [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds) |
| `resources/ffmpeg/ffprobe.exe` | (included with ffmpeg) |
| `resources/yt-dlp/yt-dlp.exe` | [yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp) |

## Release Process

1. Commit all changes
2. Push a version tag: `git tag v1.0.0 && git push --tags`
3. GitHub Actions builds `FLUX-Setup-1.0.0.exe`
4. Uploaded to GitHub Releases automatically
5. Auto-updater in existing installs picks it up within 5 seconds of next launch

## License

[MIT](LICENSE) © 2024 sayantanmandal1

## Disclaimer

FLUX does not support DRM-protected content (Widevine, AACS BluRay, PlayReady). This is an intentional legal constraint.
