import { usePlayerStore } from '@renderer/stores/player.store'
import { formatTime, formatFileSize } from '@renderer/lib/utils'
import { Copy } from 'lucide-react'

export function MediaInfoPanel() {
  const player = usePlayerStore()

  const row = (label: string, value: string | number | undefined | null) => {
    if (value === null || value === undefined || value === '') return null
    return (
      <tr className="border-b border-white/[0.04]">
        <td className="py-1.5 pr-3 text-[10px] text-white/40 whitespace-nowrap w-28 align-top">{label}</td>
        <td className="py-1.5 text-xs text-white/80 font-mono break-all">{String(value)}</td>
      </tr>
    )
  }

  const vp = player.videoParams
  const ap = player.audioParams

  return (
    <div className="flex flex-col h-full text-white">
      <div className="panel-header">
        <span className="panel-title">Media Info</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* File */}
        <section>
          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">File</div>
          <table className="w-full">
            <tbody>
              {row('Title', player.mediaTitle)}
              {row('Duration', player.duration > 0 ? formatTime(player.duration) : null)}
              {row('Format', vp?.codec ?? null)}
            </tbody>
          </table>
        </section>

        {/* Video stream */}
        {vp && (
          <section>
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Video</div>
            <table className="w-full">
              <tbody>
                {row('Codec', vp.codec)}
                {row('Resolution', vp.w && vp.h ? `${vp.w} × ${vp.h}` : null)}
                {row('Frame Rate', vp.fps ? `${vp.fps.toFixed(3)} fps` : null)}
                {row('Aspect Ratio', vp.aspect ? vp.aspect.toFixed(3) : null)}
                {row('Bit Rate', vp.bitrate ? `${Math.round(vp.bitrate / 1000)} kbps` : null)}
                {row('Color Space', vp.colorspace)}
                {row('Pixel Format', vp.pixelFormat)}
                {row('HDR', vp.hdrType)}
                {row('HW Decode', player.hwdecActive ? 'Active (D3D11VA)' : 'Software')}
              </tbody>
            </table>
          </section>
        )}

        {/* Audio stream */}
        {ap && (
          <section>
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Audio</div>
            <table className="w-full">
              <tbody>
                {row('Codec', ap.codec)}
                {row('Sample Rate', ap.samplerate ? `${ap.samplerate.toLocaleString()} Hz` : null)}
                {row('Channels', ap.channels)}
                {row('Bit Rate', ap.bitrate ? `${Math.round(ap.bitrate / 1000)} kbps` : null)}
              </tbody>
            </table>
          </section>
        )}

        {/* Tracks summary */}
        {player.tracks.length > 0 && (
          <section>
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">
              Tracks ({player.tracks.length})
            </div>
            <div className="space-y-1">
              {player.tracks.map((t) => (
                <div key={`${t.type}-${t.id}`} className="px-3 py-2 bg-white/[0.03] rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-white/10 text-white/50 font-mono">
                      {t.type}
                    </span>
                    <span className="text-xs text-white/70">
                      {t.title || t.lang || `Track ${t.id}`}
                    </span>
                    {t.selected && (
                      <span className="ml-auto text-[9px] text-purple-400">active</span>
                    )}
                  </div>
                  {t.codec && (
                    <div className="text-[10px] text-white/30 mt-0.5 font-mono">{t.codec}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {!vp && !ap && player.isIdle && (
          <div className="text-sm text-white/30 text-center py-8">
            Open a file to see media info
          </div>
        )}
      </div>
    </div>
  )
}
