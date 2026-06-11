import { useSettingsStore } from '@renderer/stores/settings.store'
import { useUIStore } from '@renderer/stores/ui.store'
import { cn } from '@renderer/lib/utils'
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'
import { useState } from 'react'

export function IntegrationTab() {
  const { settings, updateSetting } = useSettingsStore()
  const ui = useUIStore()
  const [loading, setLoading] = useState<string | null>(null)

  if (!settings) return null

  const doAction = async (key: string, action: () => Promise<void>) => {
    setLoading(key)
    try {
      await action()
      ui.addNotification('Done!', 'success')
    } catch {
      ui.addNotification('Failed', 'error')
    } finally {
      setLoading(null)
    }
  }

  const actionBtn = (
    key: string,
    label: string,
    action: () => Promise<void>,
    active?: boolean,
    danger?: boolean
  ) => (
    <button
      onClick={() => doAction(key, action)}
      disabled={loading === key}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
        danger
          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
          : active
          ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
          : 'bg-white/[0.05] text-white/60 hover:bg-white/10 hover:text-white border border-transparent'
      )}
    >
      {loading === key
        ? <Loader2 size={13} className="animate-spin" />
        : active ? <CheckCircle2 size={13} /> : null
      }
      {label}
    </button>
  )

  return (
    <div className="p-6 space-y-6">
      {/* File associations */}
      <section>
        <div className="text-[10px] text-white/30 uppercase tracking-wider mb-3">File Associations</div>
        <p className="text-xs text-white/50 mb-3">
          Register FLUX as a handler for 120+ media formats. Adds "Open with FLUX" to right-click menus.
        </p>
        <div className="flex gap-2">
          {actionBtn(
            'register',
            settings.integrations.fileAssociationsRegistered ? 'Re-register' : 'Register File Types',
            async () => {
              await window.fluxAPI.registerFileAssociations()
              await updateSetting('integrations.fileAssociationsRegistered', true)
            },
            settings.integrations.fileAssociationsRegistered
          )}
          {settings.integrations.fileAssociationsRegistered && actionBtn(
            'unregister',
            'Unregister',
            async () => {
              await window.fluxAPI.unregisterFileAssociations()
              await updateSetting('integrations.fileAssociationsRegistered', false)
            },
            false,
            true
          )}
        </div>
      </section>

      {/* Default app */}
      <section>
        <div className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Default Player</div>
        <p className="text-xs text-white/50 mb-3">
          Set FLUX as the default video and audio player in Windows settings.
        </p>
        <button
          onClick={() => window.fluxAPI.setAsDefaultApp()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-purple-600/15 text-purple-300 hover:bg-purple-600/25 border border-purple-500/20 transition-all"
        >
          <ExternalLink size={13} />
          Open Default Apps Settings
        </button>
      </section>

      {/* Start with Windows */}
      <section>
        <div className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Startup</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-white/80">Start with Windows</div>
            <div className="text-xs text-white/35 mt-0.5">Launch FLUX automatically at login</div>
          </div>
          <button
            onClick={async () => {
              const next = !settings.integrations.startWithWindows
              await window.fluxAPI.setStartWithWindows(next)
              await updateSetting('integrations.startWithWindows', next)
            }}
            className={cn(
              'relative w-10 h-5 rounded-full transition-all duration-200',
              settings.integrations.startWithWindows ? 'bg-purple-600' : 'bg-white/15'
            )}
          >
            <div className={cn(
              'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
              settings.integrations.startWithWindows ? 'translate-x-5' : 'translate-x-0.5'
            )} />
          </button>
        </div>
      </section>
    </div>
  )
}
