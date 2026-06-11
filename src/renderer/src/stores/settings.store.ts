import { create } from 'zustand'
import type { AppSettings } from '@shared/types'

interface SettingsStore {
  settings: AppSettings | null
  loaded: boolean
  setSettings: (settings: AppSettings) => void
  updateSetting: (key: string, value: unknown) => Promise<void>
  loadSettings: () => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  loaded: false,

  setSettings: (settings) => set({ settings, loaded: true }),

  loadSettings: async () => {
    const settings = await window.fluxAPI.settingsGet()
    set({ settings, loaded: true })
  },

  updateSetting: async (key: string, value: unknown) => {
    await window.fluxAPI.settingsSet(key, value)
    // Optimistically update local state
    set((state) => {
      if (!state.settings) return {}
      const updated = { ...state.settings }
      const parts = key.split('.')
      if (parts.length === 2) {
        const section = parts[0] as keyof AppSettings
        const field = parts[1]
        ;(updated[section] as Record<string, unknown>)[field] = value
      } else {
        ;(updated as Record<string, unknown>)[key] = value
      }
      return { settings: updated }
    })
  },
}))
