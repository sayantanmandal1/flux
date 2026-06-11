import { useEffect, useCallback } from 'react'
import { usePlayerStore } from '@renderer/stores/player.store'
import { useUIStore } from '@renderer/stores/ui.store'
import { useSettingsStore } from '@renderer/stores/settings.store'
import { usePlayerEngine } from '@renderer/contexts/usePlayerEngine'

type KeyHandler = (e: KeyboardEvent) => void

export function useKeyboard() {
  const player = usePlayerStore()
  const ui = useUIStore()
  const settings = useSettingsStore()
  const engine = usePlayerEngine()

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const api = window.fluxAPI
      const key = buildKeyString(e)

      switch (key) {
        case 'Space':
          e.preventDefault()
          engine.playPause()
          break
        case 'ArrowRight':
          e.preventDefault()
          engine.seekRelative(10)
          break
        case 'ArrowLeft':
          e.preventDefault()
          engine.seekRelative(-10)
          break
        case 'Shift+ArrowRight':
          e.preventDefault()
          engine.seekRelative(60)
          break
        case 'Shift+ArrowLeft':
          e.preventDefault()
          engine.seekRelative(-60)
          break
        case 'ArrowUp':
          e.preventDefault()
          engine.setVolume(Math.min(200, player.volume + 5))
          break
        case 'ArrowDown':
          e.preventDefault()
          engine.setVolume(Math.max(0, player.volume - 5))
          break
        case 'M':
          engine.setMuted(!player.muted)
          break
        case 'F':
          api.setFullscreen(!player.isFullscreen)
          break
        case 'Escape':
          if (player.isFullscreen) api.setFullscreen(false)
          if (ui.activeModal) ui.closeModal()
          else if (ui.activePanel) ui.setActivePanel(null)
          break
        case 'Period': // frame step
          e.preventDefault()
          api.frameStep()
          break
        case 'Comma': // frame back step
          e.preventDefault()
          api.frameBackStep()
          break
        case ']':
          e.preventDefault()
          engine.setSpeed(Math.min(10, player.speed + 0.25))
          break
        case '[':
          e.preventDefault()
          engine.setSpeed(Math.max(0.25, player.speed - 0.25))
          break
        case '=':
        case 'Backspace':
          if (key === '=') {
            e.preventDefault()
            engine.setSpeed(1.0)
          }
          break
        case 'S':
          engine.takeScreenshot().catch(() => {})
          break
        case 'L':
          ui.togglePanel('playlist')
          break
        case 'U':
          ui.togglePanel('subtitles')
          break
        case 'E':
          ui.togglePanel('equalizer')
          break
        case 'I':
          ui.togglePanel('mediaInfo')
          break
        case 'A':
          // A-B loop: set A
          if (ui.abLoopMode === 'none') {
            api.setAbLoopA(player.position)
            ui.setAbLoopMode('a-set')
          }
          break
        case 'B':
          // A-B loop: set B
          if (ui.abLoopMode === 'a-set') {
            api.setAbLoopB(player.position)
            ui.setAbLoopMode('ab-set')
          }
          break
        case 'Ctrl+A':
          api.clearAbLoop()
          ui.setAbLoopMode('none')
          break
        case 'N':
          api.loadNext()
          break
        case 'P':
          api.loadPrev()
          break
        case 'PageDown':
          api.nextChapter()
          break
        case 'PageUp':
          api.prevChapter()
          break
        case 'H':
          api.setSubDelay(0.1)
          break
        case 'G':
          api.setSubDelay(-0.1)
          break
        case 'Ctrl+H':
          api.setAudioDelay(0.1)
          break
        case 'Ctrl+G':
          api.setAudioDelay(-0.1)
          break
        case 'D':
          ui.addNotification('Deinterlace toggled', 'info', 1500)
          api.mpvCommand(['cycle', 'deinterlace'])
          break
        case 'Ctrl+O':
          e.preventDefault()
          api.openFileDialog().then((files) => {
            if (files?.[0]) api.loadFile(files[0])
          })
          break
        case 'Ctrl+U':
          e.preventDefault()
          ui.setActiveModal('openUrl')
          break
        case 'Ctrl+P':
          e.preventDefault()
          ui.setActiveModal('pip')
          break
        case 'Ctrl+=':
          e.preventDefault()
          api.zoom(player.zoom + 0.1)
          break
        case 'Ctrl+-':
          e.preventDefault()
          api.zoom(player.zoom - 0.1)
          break
        case 'Ctrl+0':
          e.preventDefault()
          api.zoom(0)
          api.pan(0, 0)
          break
        case 'Ctrl+S':
          api.mpvCommand(['cycle', 'sub'])
          break
      }
    },
    [player, ui, settings.settings]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])
}

function buildKeyString(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')

  let key = e.key
  if (key === ' ') key = 'Space'
  if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
    parts.push(key)
  }
  return parts.join('+')
}
