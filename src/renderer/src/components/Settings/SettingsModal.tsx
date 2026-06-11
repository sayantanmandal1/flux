import { useState } from 'react'
import { X, Settings, Shield, Keyboard, Monitor } from 'lucide-react'
import { useUIStore } from '@renderer/stores/ui.store'
import { useSettingsStore } from '@renderer/stores/settings.store'
import { motion } from 'framer-motion'
import { cn } from '@renderer/lib/utils'
import { GeneralTab } from './tabs/GeneralTab'
import { ShortcutsTab } from './tabs/ShortcutsTab'
import { IntegrationTab } from './tabs/IntegrationTab'

const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  { id: 'integration', label: 'Integration', icon: Monitor },
] as const

export function SettingsModal() {
  const ui = useUIStore()
  const settings = useSettingsStore()
  const [activeTab, setActiveTab] = useState<string>('general')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => ui.closeModal()} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-2xl mx-4 glass rounded-2xl shadow-glass-lg z-10 flex flex-col"
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-purple-400" />
            <h2 className="text-base font-semibold text-white">Settings</h2>
          </div>
          <button
            onClick={() => ui.closeModal()}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar tabs */}
          <div className="w-40 flex-shrink-0 border-r border-white/[0.06] p-2 space-y-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all text-left',
                  activeTab === tab.id
                    ? 'bg-purple-600/15 text-purple-300'
                    : 'text-white/40 hover:text-white hover:bg-white/10'
                )}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'general' && <GeneralTab />}
            {activeTab === 'shortcuts' && <ShortcutsTab />}
            {activeTab === 'integration' && <IntegrationTab />}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
