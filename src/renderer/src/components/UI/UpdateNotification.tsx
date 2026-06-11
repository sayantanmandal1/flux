import { useUIStore } from '@renderer/stores/ui.store'
import { Download, X, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function UpdateNotification() {
  const ui = useUIStore()
  const info = ui.updateInfo

  if (!info) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-10 right-4 z-50 w-72 glass rounded-2xl p-4 shadow-glass-lg border border-purple-500/20"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            {info.downloaded
              ? <RefreshCw size={14} className="text-purple-400" />
              : <Download size={14} className="text-purple-400" />
            }
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              {info.downloaded ? 'Update ready!' : 'Update available'}
            </p>
            <p className="text-xs text-white/50 mt-0.5">
              FLUX v{info.version}
              {!info.downloaded && info.progress !== undefined && (
                <span> — {Math.round(info.progress)}%</span>
              )}
            </p>
            {!info.downloaded && info.progress !== undefined && (
              <div className="mt-2 h-1 bg-white/10 rounded-full">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${info.progress}%` }}
                />
              </div>
            )}
            {info.downloaded && (
              <button
                onClick={() => window.fluxAPI.installUpdate()}
                className="mt-2 w-full py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors"
              >
                Restart & Install
              </button>
            )}
          </div>
          <button
            onClick={() => ui.setUpdateInfo(null)}
            className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
