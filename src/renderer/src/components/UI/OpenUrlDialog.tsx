import { useState } from 'react'
import { X, Globe, Loader2 } from 'lucide-react'
import { useUIStore } from '@renderer/stores/ui.store'
import { motion } from 'framer-motion'

export function OpenUrlDialog() {
  const ui = useUIStore()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleOpen = async () => {
    if (!url.trim()) return
    setLoading(true)
    try {
      await window.fluxAPI.loadUrl(url.trim())
      ui.closeModal()
      ui.addNotification('Stream loading…', 'info')
    } catch {
      ui.addNotification('Failed to open URL', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleOpen()
    if (e.key === 'Escape') ui.closeModal()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => ui.closeModal()} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-lg mx-4 glass rounded-2xl p-6 shadow-glass-lg z-10"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-purple-400" />
            <h2 className="text-base font-semibold text-white">Open URL</h2>
          </div>
          <button
            onClick={() => ui.closeModal()}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-white/40 mb-4">
          Supports YouTube, Twitch, Vimeo, HTTP/HLS/DASH streams, RTSP/RTMP, and more.
        </p>

        <input
          autoFocus
          type="url"
          placeholder="https://www.youtube.com/watch?v=… or rtsp://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-sm text-white placeholder-white/25 outline-none focus:border-purple-500/50 focus:bg-white/[0.08] transition-all"
        />

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => ui.closeModal()}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:bg-white/10 text-sm transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleOpen}
            disabled={!url.trim() || loading}
            className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Opening…' : 'Open'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
