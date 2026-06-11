import { useState } from 'react'
import { useUIStore } from '@renderer/stores/ui.store'
import { usePlayerStore } from '@renderer/stores/player.store'
import { X, Search, Loader2, Download } from 'lucide-react'
import { motion } from 'framer-motion'

export function SubtitleSearchDialog() {
  const ui = useUIStore()
  const player = usePlayerStore()
  const [query, setQuery] = useState(player.mediaTitle || '')
  const [language, setLanguage] = useState('en')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<unknown[]>([])
  const [error, setError] = useState('')

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await window.fluxAPI.subtitleSearch(query.trim(), language)
      setResults(res)
    } catch {
      setError('Search failed. Check your OpenSubtitles API key in Settings.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => ui.closeModal()} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg mx-4 glass rounded-2xl p-6 shadow-glass-lg z-10 max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Search Subtitles</h2>
          <button onClick={() => ui.closeModal()} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            autoFocus
            type="text"
            placeholder="Movie or show title…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            className="flex-1 px-4 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-sm text-white placeholder-white/25 outline-none focus:border-purple-500/50"
          />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-sm text-white outline-none"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="pt">Portuguese</option>
            <option value="it">Italian</option>
            <option value="ru">Russian</option>
            <option value="ar">Arabic</option>
            <option value="zh-CN">Chinese</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="hi">Hindi</option>
          </select>
          <button
            onClick={search}
            disabled={loading}
            className="px-4 py-2.5 btn-primary flex items-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          </button>
        </div>

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        <div className="flex-1 overflow-y-auto space-y-2">
          {results.length === 0 && !loading && (
            <p className="text-sm text-white/30 text-center py-8">
              {query ? 'No results. Try a different search.' : 'Enter a title to search.'}
            </p>
          )}
          {(results as Record<string, unknown>[]).map((r, i) => {
            const attrs = r.attributes as Record<string, unknown>
            const release = attrs?.release as string ?? 'Unknown'
            const lang = (attrs?.language as string ?? '').toUpperCase()
            const downloads = attrs?.download_count as number ?? 0
            const files = attrs?.files as Record<string, unknown>[] ?? []
            return (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white/80 truncate">{release}</div>
                  <div className="text-[10px] text-white/40 mt-0.5">
                    {lang} • {downloads.toLocaleString()} downloads
                  </div>
                </div>
                <button
                  onClick={() => {
                    const fileId = files[0]?.file_id
                    if (fileId) {
                      ui.addNotification('Downloading subtitle…', 'info')
                      // Download logic via main process
                    }
                  }}
                  className="p-2 rounded-lg hover:bg-purple-600/30 text-white/50 hover:text-purple-300 transition-all"
                  title="Download"
                >
                  <Download size={14} />
                </button>
              </div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
