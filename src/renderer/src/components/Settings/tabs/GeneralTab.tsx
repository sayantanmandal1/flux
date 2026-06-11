import { useSettingsStore } from '@renderer/stores/settings.store'
import { cn } from '@renderer/lib/utils'

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        'relative w-10 h-5 rounded-full transition-all duration-200',
        value ? 'bg-purple-600' : 'bg-white/15'
      )}
    >
      <div className={cn(
        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
        value ? 'translate-x-5' : 'translate-x-0.5'
      )} />
    </button>
  )
}

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/[0.05]">
      <div>
        <div className="text-sm text-white/80">{label}</div>
        {description && <div className="text-xs text-white/35 mt-0.5">{description}</div>}
      </div>
      <div className="ml-4 flex-shrink-0">{children}</div>
    </div>
  )
}

export function GeneralTab() {
  const { settings, updateSetting } = useSettingsStore()
  if (!settings) return null

  return (
    <div className="p-6 space-y-1">
      <div className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Playback</div>
      <Row label="Resume playback" description="Pick up where you left off">
        <Toggle value={settings.general.resumePlayback} onChange={(v) => updateSetting('general.resumePlayback', v)} />
      </Row>
      <Row label="Remember volume" description="Save volume between sessions">
        <Toggle value={settings.general.rememberVolume} onChange={(v) => updateSetting('general.rememberVolume', v)} />
      </Row>
      <Row label="Pause on minimize">
        <Toggle value={settings.playback.pauseOnMinimize} onChange={(v) => updateSetting('playback.pauseOnMinimize', v)} />
      </Row>

      <div className="text-[10px] text-white/30 uppercase tracking-wider mb-3 mt-5">Window</div>
      <Row label="Start minimized">
        <Toggle value={settings.general.startMinimized} onChange={(v) => updateSetting('general.startMinimized', v)} />
      </Row>
      <Row label="Minimize to tray">
        <Toggle value={settings.general.minimizeToTray} onChange={(v) => updateSetting('general.minimizeToTray', v)} />
      </Row>
      <Row label="Close to tray">
        <Toggle value={settings.general.closeToTray} onChange={(v) => updateSetting('general.closeToTray', v)} />
      </Row>

      <div className="text-[10px] text-white/30 uppercase tracking-wider mb-3 mt-5">Updates</div>
      <Row label="Auto-check for updates">
        <Toggle value={settings.general.autoCheckUpdates} onChange={(v) => updateSetting('general.autoCheckUpdates', v)} />
      </Row>

      <div className="text-[10px] text-white/30 uppercase tracking-wider mb-3 mt-5">Screenshots</div>
      <Row label="Format">
        <select
          value={settings.general.screenshotFormat}
          onChange={(e) => updateSetting('general.screenshotFormat', e.target.value)}
          className="px-3 py-1.5 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white outline-none"
        >
          <option value="png">PNG</option>
          <option value="jpg">JPEG</option>
          <option value="webp">WebP</option>
        </select>
      </Row>

      <div className="text-[10px] text-white/30 uppercase tracking-wider mb-3 mt-5">Hardware Decoding</div>
      <Row label="Hardware decode" description="D3D11VA → DXVA2 → CPU fallback">
        <select
          value={settings.playback.hardwareDecoding}
          onChange={(e) => updateSetting('playback.hardwareDecoding', e.target.value)}
          className="px-3 py-1.5 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white outline-none"
        >
          <option value="auto">Auto (Recommended)</option>
          <option value="yes">Always</option>
          <option value="no">Disabled</option>
        </select>
      </Row>
    </div>
  )
}
