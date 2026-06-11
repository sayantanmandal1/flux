import { Film, Music, Library, Clock, Settings, Globe, FolderOpen } from 'lucide-react'
import { useUIStore } from '@renderer/stores/ui.store'
import { cn } from '@renderer/lib/utils'

const NAV_ITEMS = [
  { icon: Film, label: 'Now Playing', panel: null as null },
  { icon: Library, label: 'Library', panel: 'library' as const },
  { icon: Clock, label: 'Recent', panel: null as null },
] as const

export function Sidebar() {
  const ui = useUIStore()

  return (
    <div className="w-56 h-full bg-[#080808] border-r border-white/[0.06] flex flex-col">
      {/* Nav items */}
      <div className="p-2 space-y-0.5 flex-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              if (item.panel) ui.togglePanel(item.panel)
            }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left',
              item.panel && ui.activePanel === item.panel
                ? 'bg-purple-600/15 text-purple-300'
                : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
            )}
          >
            <item.icon size={15} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Bottom settings */}
      <div className="p-2 border-t border-white/[0.06]">
        <button
          onClick={() => ui.setActiveModal('settings')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          <Settings size={15} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  )
}
