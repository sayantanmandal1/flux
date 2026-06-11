// Separate file so React Fast Refresh can handle PlayerEngineContext.tsx correctly.
// Fast Refresh requires files to export EITHER only components OR only non-components.
// This file exports the hook (non-component), the main file exports the Provider (component).
import { useContext } from 'react'
import { Ctx } from './PlayerEngineContext'
import type { PlayerEngine } from './PlayerEngineContext'

export function usePlayerEngine(): PlayerEngine {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePlayerEngine must be used inside PlayerEngineProvider')
  return ctx
}

export type { PlayerEngine }
