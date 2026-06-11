#!/usr/bin/env node
/**
 * Download script for FLUX binary dependencies.
 * Fetches: mpv.exe, ffmpeg.exe, ffprobe.exe, yt-dlp.exe
 * Run: node scripts/download-resources.cjs
 */
'use strict'

const { execSync, spawnSync } = require('child_process')
const { existsSync, mkdirSync, writeFileSync, createWriteStream, rmSync } = require('fs')
const { join, resolve } = require('path')
const https = require('https')
const http = require('http')

const ROOT = resolve(__dirname, '..')
const RESOURCES = join(ROOT, 'resources')

const dirs = {
  mpv: join(RESOURCES, 'mpv'),
  ffmpeg: join(RESOURCES, 'ffmpeg'),
  ytdlp: join(RESOURCES, 'yt-dlp'),
  icons: join(RESOURCES, 'icons'),
}

Object.values(dirs).forEach((d) => {
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg) { console.log(`[download-resources] ${msg}`) }
function err(msg) { console.error(`[download-resources] ERROR: ${msg}`) }

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    log(`Downloading ${url.split('/').pop()}…`)
    const file = createWriteStream(dest)
    const get = url.startsWith('https') ? https.get : http.get
    const req = get(url, { headers: { 'User-Agent': 'FLUX-Media-Player/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close()
        rmSync(dest, { force: true })
        return download(res.headers.location, dest).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        file.close()
        rmSync(dest, { force: true })
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      }
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve()))
    })
    req.on('error', (e) => { file.close(); rmSync(dest, { force: true }); reject(e) })
  })
}

async function getLatestGitHubRelease(repo, assetPattern) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${repo}/releases/latest`,
      headers: {
        'User-Agent': 'FLUX-Media-Player/1.0',
        'Accept': 'application/vnd.github.v3+json',
      }
    }
    https.get(options, (res) => {
      let body = ''
      res.on('data', (d) => (body += d))
      res.on('end', () => {
        try {
          const data = JSON.parse(body)
          const asset = data.assets.find((a) => assetPattern.test(a.name))
          if (!asset) reject(new Error(`No asset matching ${assetPattern} in ${repo}`))
          else resolve({ url: asset.browser_download_url, name: asset.name, version: data.tag_name })
        } catch (e) { reject(e) }
      })
    }).on('error', reject)
  })
}

function extractZip(zipPath, destDir) {
  try {
    // Use PowerShell Expand-Archive (available on Windows 10+)
    spawnSync('powershell', [
      '-NoProfile', '-NonInteractive', '-Command',
      `Expand-Archive -Path "${zipPath}" -DestinationPath "${destDir}" -Force`
    ], { stdio: 'inherit' })
    log(`Extracted to ${destDir}`)
  } catch {
    err('Failed to extract zip — please extract manually')
  }
}

// ─── yt-dlp ──────────────────────────────────────────────────────────────────

async function downloadYtDlp() {
  const dest = join(dirs.ytdlp, 'yt-dlp.exe')
  if (existsSync(dest)) { log('yt-dlp.exe already exists, skipping'); return }

  try {
    const { url, version } = await getLatestGitHubRelease('yt-dlp/yt-dlp', /^yt-dlp\.exe$/)
    log(`yt-dlp ${version} → ${url}`)
    await download(url, dest)
    log(`yt-dlp.exe saved to ${dest}`)
  } catch (e) {
    err(`yt-dlp download failed: ${e.message}`)
    log('Manual download: https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe')
  }
}

// ─── FFmpeg ──────────────────────────────────────────────────────────────────

async function downloadFfmpeg() {
  const ffmpegDest = join(dirs.ffmpeg, 'ffmpeg.exe')
  const ffprobeDest = join(dirs.ffmpeg, 'ffprobe.exe')
  if (existsSync(ffmpegDest) && existsSync(ffprobeDest)) {
    log('ffmpeg.exe and ffprobe.exe already exist, skipping')
    return
  }

  try {
    // BtbN builds — latest GPL full build Windows x64
    const { url, version, name } = await getLatestGitHubRelease(
      'BtbN/FFmpeg-Builds',
      /ffmpeg-master-latest-win64-gpl\.zip$/
    )
    log(`FFmpeg ${version} → ${url}`)
    const zipPath = join(dirs.ffmpeg, name)
    await download(url, zipPath)
    extractZip(zipPath, dirs.ffmpeg)
    // Move binaries from subdirectory
    spawnSync('powershell', [
      '-NoProfile', '-Command',
      `Get-ChildItem -Recurse -Filter "ffmpeg.exe" "${dirs.ffmpeg}" | Select-Object -First 1 | Move-Item -Destination "${ffmpegDest}" -Force;` +
      `Get-ChildItem -Recurse -Filter "ffprobe.exe" "${dirs.ffmpeg}" | Select-Object -First 1 | Move-Item -Destination "${ffprobeDest}" -Force`
    ], { stdio: 'inherit' })
    log(`FFmpeg binaries saved to ${dirs.ffmpeg}`)
  } catch (e) {
    err(`FFmpeg download failed: ${e.message}`)
    log('Manual download: https://github.com/BtbN/FFmpeg-Builds/releases — pick ffmpeg-master-latest-win64-gpl.zip')
  }
}

// ─── mpv ─────────────────────────────────────────────────────────────────────

async function downloadMpv() {
  const mpvDest = join(dirs.mpv, 'mpv.exe')
  if (existsSync(mpvDest)) { log('mpv.exe already exists, skipping'); return }

  try {
    // zhongfly/mpv-winbuild — reliable Windows builds
    const { url, version, name } = await getLatestGitHubRelease(
      'zhongfly/mpv-winbuild',
      /mpv-x86_64.*\.7z$/
    )
    log(`mpv ${version} → ${url}`)
    const archivePath = join(dirs.mpv, name)
    await download(url, archivePath)

    // Try 7zip extraction (common on Windows)
    const sevenZip = existsSync('C:\\Program Files\\7-Zip\\7z.exe')
      ? 'C:\\Program Files\\7-Zip\\7z.exe'
      : '7z'
    spawnSync(sevenZip, ['e', archivePath, `mpv.exe`, `mpv-2.dll`, '-o' + dirs.mpv, '-y'], { stdio: 'inherit' })
    log(`mpv saved to ${dirs.mpv}`)
  } catch (e) {
    err(`mpv download failed: ${e.message}`)
    log('Manual download options:')
    log('  - https://github.com/zhongfly/mpv-winbuild/releases (recommended)')
    log('  - https://sourceforge.net/projects/mpv-player-windows/files/')
    log('Extract mpv.exe and mpv-2.dll into: ' + dirs.mpv)
  }
}

// ─── Placeholder icons ────────────────────────────────────────────────────────

function createPlaceholderIcons() {
  // Create minimal PNG placeholders (1x1 transparent PNG)
  // In production, replace with proper 32x32 icon PNGs
  const tinyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABdJREFUeNpiYBgFgx8AAQAAAAAAAAAAAAAAAAAAAAAAAQABAAEAAAABAAAAKwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
    'base64'
  )
  ;['play', 'pause', 'prev', 'next', 'tray', 'icon'].forEach((name) => {
    const p = join(dirs.icons, `${name}.png`)
    if (!existsSync(p)) {
      writeFileSync(p, tinyPng)
      log(`Created placeholder ${name}.png`)
    }
  })
  log('Note: Replace icons in resources/icons/ with proper 32x32 PNG icons before building')
}

// ─── Main ─────────────────────────────────────────────────────────────────────

;(async () => {
  log('='.repeat(50))
  log('FLUX Resource Downloader')
  log('='.repeat(50))

  await downloadYtDlp()
  await downloadFfmpeg()
  await downloadMpv()
  createPlaceholderIcons()

  log('='.repeat(50))
  log('Done! Resources downloaded to: ' + RESOURCES)
  log('')
  log('Verify these files exist before building:')
  ;[
    join(dirs.mpv, 'mpv.exe'),
    join(dirs.ffmpeg, 'ffmpeg.exe'),
    join(dirs.ffmpeg, 'ffprobe.exe'),
    join(dirs.ytdlp, 'yt-dlp.exe'),
  ].forEach((f) => {
    const exists = existsSync(f) ? '✓' : '✗ MISSING'
    log(`  ${exists}  ${f}`)
  })
})()
