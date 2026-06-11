import { spawn } from 'child_process'
import { existsSync, statSync, readdirSync } from 'fs'
import { join, extname, basename } from 'path'
import { EventEmitter } from 'events'
import { VIDEO_EXTENSIONS, AUDIO_EXTENSIONS } from '../../shared/constants'
import { upsertMediaItem } from './media-db'
import type { MediaItem } from '../../shared/types'

const ALL_EXTENSIONS = new Set([
  ...VIDEO_EXTENSIONS.map((e) => `.${e}`),
  ...AUDIO_EXTENSIONS.map((e) => `.${e}`),
])

export class MediaScanner extends EventEmitter {
  private ffprobeBin: string
  private coverArtDir: string
  private scanning = false
  private queue: string[] = []

  constructor(ffprobeBin: string, coverArtDir: string) {
    super()
    this.ffprobeBin = ffprobeBin
    this.coverArtDir = coverArtDir
  }

  async scanFolder(folder: string): Promise<void> {
    if (!existsSync(folder)) return
    const files = this.collectMediaFiles(folder)
    this.emit('scanStart', { total: files.length, folder })

    let processed = 0
    for (const file of files) {
      try {
        const item = await this.probeFile(file)
        if (item) {
          upsertMediaItem(item)
          this.emit('itemScanned', item)
        }
      } catch {}
      processed++
      this.emit('scanProgress', { processed, total: files.length })
    }

    this.emit('scanComplete', { total: files.length, folder })
  }

  private collectMediaFiles(dir: string): string[] {
    const results: string[] = []
    const walk = (d: string) => {
      try {
        const entries = readdirSync(d, { withFileTypes: true })
        for (const entry of entries) {
          const full = join(d, entry.name)
          if (entry.isDirectory()) {
            walk(full)
          } else if (entry.isFile()) {
            const ext = extname(entry.name).toLowerCase()
            if (ALL_EXTENSIONS.has(ext)) {
              results.push(full)
            }
          }
        }
      } catch {}
    }
    walk(dir)
    return results
  }

  async probeFile(filePath: string): Promise<Omit<MediaItem, 'id'> | null> {
    if (!existsSync(this.ffprobeBin)) return null

    return new Promise((resolve) => {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath,
      ]

      const proc = spawn(this.ffprobeBin, args)
      let stdout = ''
      let stderr = ''
      proc.stdout.on('data', (d) => (stdout += d.toString()))
      proc.stderr.on('data', (d) => (stderr += d.toString()))
      proc.on('close', (code) => {
        if (code !== 0) {
          resolve(null)
          return
        }
        try {
          const data = JSON.parse(stdout)
          resolve(this.buildMediaItem(filePath, data))
        } catch {
          resolve(null)
        }
      })
      proc.on('error', () => resolve(null))

      // Timeout after 30s
      setTimeout(() => {
        proc.kill()
        resolve(null)
      }, 30000)
    })
  }

  private buildMediaItem(
    filePath: string,
    data: Record<string, unknown>
  ): Omit<MediaItem, 'id'> {
    const fmt = (data.format as Record<string, unknown>) || {}
    const streams = (data.streams as Record<string, unknown>[]) || []
    const tags = (fmt.tags as Record<string, string>) || {}

    const videoStream = streams.find((s) => s.codec_type === 'video')
    const audioStream = streams.find((s) => s.codec_type === 'audio')

    const ext = extname(filePath).replace('.', '').toLowerCase()
    const isAudio = !videoStream && AUDIO_EXTENSIONS.includes(ext as never)

    let fps: number | undefined
    if (videoStream?.r_frame_rate) {
      const parts = String(videoStream.r_frame_rate).split('/')
      if (parts.length === 2) {
        fps = Number(parts[0]) / Number(parts[1])
      }
    }

    const stat = (() => {
      try {
        return statSync(filePath)
      } catch {
        return { size: 0 }
      }
    })()

    return {
      filePath,
      fileName: basename(filePath),
      title: tags.title || basename(filePath, extname(filePath)),
      duration: parseFloat(String(fmt.duration || '0')),
      size: stat.size,
      width: videoStream?.width as number | undefined,
      height: videoStream?.height as number | undefined,
      fps,
      videoCodec: videoStream?.codec_name as string | undefined,
      audioCodec: audioStream?.codec_name as string | undefined,
      bitrate: parseInt(String(fmt.bit_rate || '0'), 10) || undefined,
      artist: tags.artist || tags.album_artist || undefined,
      album: tags.album || undefined,
      year: tags.date ? parseInt(tags.date.substring(0, 4), 10) || undefined : undefined,
      type: isAudio ? 'audio' : 'video',
      addedAt: Date.now(),
    }
  }
}
