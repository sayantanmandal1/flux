import { app } from 'electron'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'
import type { MediaItem, RecentFile } from '../../shared/types'

// Lazy-load better-sqlite3 — gracefully degrades if native module not yet compiled
let Database: typeof import('better-sqlite3') | null = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Database = require('better-sqlite3')
} catch {
  console.warn('[media-db] better-sqlite3 not available (native module not built). Library & bookmarks disabled until rebuilt.')
}

let db: ReturnType<NonNullable<typeof Database>> | null = null

function getDb(): ReturnType<NonNullable<typeof Database>> | null {
  if (!Database) return null
  if (!db) {
    try {
      const dir = join(app.getPath('userData'), 'flux')
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      db = new Database(join(dir, 'media-library.db'))
      db.pragma('journal_mode = WAL')
      db.pragma('foreign_keys = ON')
      migrate(db)
    } catch (e) {
      console.warn('[media-db] Failed to open SQLite database:', (e as Error).message)
      db = null
      Database = null
      return null
    }
  }
  return db
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrate(database: any): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS media_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT UNIQUE NOT NULL,
      file_name TEXT NOT NULL,
      title TEXT,
      duration REAL DEFAULT 0,
      size INTEGER DEFAULT 0,
      width INTEGER,
      height INTEGER,
      fps REAL,
      video_codec TEXT,
      audio_codec TEXT,
      bitrate INTEGER,
      cover_art_path TEXT,
      artist TEXT,
      album TEXT,
      year INTEGER,
      type TEXT DEFAULT 'video',
      added_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      watched_at INTEGER,
      watched_percent REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT NOT NULL,
      position REAL NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS recent_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      title TEXT,
      duration REAL DEFAULT 0,
      watched_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      watched_percent REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS watch_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT NOT NULL,
      position REAL NOT NULL,
      duration REAL,
      watched_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_media_path ON media_items(file_path);
    CREATE INDEX IF NOT EXISTS idx_media_type ON media_items(type);
    CREATE INDEX IF NOT EXISTS idx_media_added ON media_items(added_at DESC);
    CREATE INDEX IF NOT EXISTS idx_recent_watched ON recent_files(watched_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_path ON bookmarks(file_path);
  `)
}

// ─── Media Library ────────────────────────────────────────────────────────────

export function upsertMediaItem(item: Omit<MediaItem, 'id'>): void {
  const db = getDb()
  if (!db) return
  const stmt = db.prepare(`
    INSERT INTO media_items
      (file_path, file_name, title, duration, size, width, height, fps,
       video_codec, audio_codec, bitrate, cover_art_path, artist, album, year, type)
    VALUES
      (@filePath, @fileName, @title, @duration, @size, @width, @height, @fps,
       @videoCodec, @audioCodec, @bitrate, @coverArtPath, @artist, @album, @year, @type)
    ON CONFLICT(file_path) DO UPDATE SET
      title = excluded.title,
      duration = excluded.duration,
      size = excluded.size,
      width = excluded.width,
      height = excluded.height,
      fps = excluded.fps,
      video_codec = excluded.video_codec,
      audio_codec = excluded.audio_codec,
      bitrate = excluded.bitrate,
      cover_art_path = excluded.cover_art_path,
      artist = excluded.artist,
      album = excluded.album,
      year = excluded.year,
      type = excluded.type
  `)
  stmt.run({
    filePath: item.filePath,
    fileName: item.fileName,
    title: item.title || item.fileName,
    duration: item.duration || 0,
    size: item.size || 0,
    width: item.width ?? null,
    height: item.height ?? null,
    fps: item.fps ?? null,
    videoCodec: item.videoCodec ?? null,
    audioCodec: item.audioCodec ?? null,
    bitrate: item.bitrate ?? null,
    coverArtPath: item.coverArtPath ?? null,
    artist: item.artist ?? null,
    album: item.album ?? null,
    year: item.year ?? null,
    type: item.type || 'video',
  })
}

export function getAllMediaItems(): MediaItem[] {
  const db = getDb()
  if (!db) return []
  return db
    .prepare('SELECT * FROM media_items ORDER BY added_at DESC')
    .all() as MediaItem[]
}

export function removeMediaItem(filePath: string): void {
  const db = getDb()
  if (!db) return
  db.prepare('DELETE FROM media_items WHERE file_path = ?').run(filePath)
}

export function updateWatchedProgress(filePath: string, percent: number): void {
  const db = getDb()
  if (!db) return
  const now = Date.now()
  db.prepare(
    'UPDATE media_items SET watched_at = ?, watched_percent = ? WHERE file_path = ?'
  ).run(now, percent, filePath)
}

// ─── Bookmarks ────────────────────────────────────────────────────────────────

export function saveBookmark(filePath: string, position: number): void {
  const db = getDb()
  if (!db) return
  // Delete existing bookmark for this file
  db.prepare('DELETE FROM bookmarks WHERE file_path = ?').run(filePath)
  db.prepare(
    'INSERT INTO bookmarks (file_path, position) VALUES (?, ?)'
  ).run(filePath, position)
}

export function getBookmark(filePath: string): number | null {
  const db = getDb()
  if (!db) return null
  const row = db
    .prepare('SELECT position FROM bookmarks WHERE file_path = ? ORDER BY created_at DESC LIMIT 1')
    .get(filePath) as { position: number } | undefined
  return row?.position ?? null
}

export function deleteBookmark(filePath: string): void {
  const db = getDb()
  if (!db) return
  db.prepare('DELETE FROM bookmarks WHERE file_path = ?').run(filePath)
}

// ─── Recent Files ─────────────────────────────────────────────────────────────

export function addRecentFile(path: string, title: string, duration: number, percent = 0): void {
  const db = getDb()
  if (!db) return
  db.prepare(`
    INSERT INTO recent_files (path, title, duration, watched_at, watched_percent)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(path) DO UPDATE SET
      title = excluded.title,
      duration = excluded.duration,
      watched_at = excluded.watched_at,
      watched_percent = excluded.watched_percent
  `).run(path, title, duration, Date.now(), percent)

  // Keep only 50 most recent
  db.prepare(`
    DELETE FROM recent_files WHERE id NOT IN (
      SELECT id FROM recent_files ORDER BY watched_at DESC LIMIT 50
    )
  `).run()
}

export function getRecentFiles(limit = 50): RecentFile[] {
  const db = getDb()
  if (!db) return []
  return (db
    .prepare(`
      SELECT path, title, duration, watched_at as watchedAt, watched_percent as watchedPercent
      FROM recent_files
      ORDER BY watched_at DESC
      LIMIT ?
    `)
    .all(limit) as RecentFile[])
}

// ─── Watch History ───────────────────────────────────────────────────────────

export function addWatchHistory(filePath: string, position: number, duration?: number): void {
  const db = getDb()
  if (!db) return
  db.prepare(
    'INSERT INTO watch_history (file_path, position, duration) VALUES (?, ?, ?)'
  ).run(filePath, position, duration ?? null)
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
