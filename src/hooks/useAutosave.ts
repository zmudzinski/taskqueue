import { useCallback, useEffect, useRef } from 'react'
import { saveState } from '../lib/persistence'
import type { PersistedState } from '../types'

type UseAutosaveParams = {
  loaded: boolean
  delayMs?: number
  trackedTasks: unknown
  trackedGroups: unknown
  trackedSettings: unknown
  getPersistedState: () => PersistedState
  onSaved?: (timestamp: number) => void
}

export function useAutosave({
  loaded,
  trackedTasks,
  trackedGroups,
  trackedSettings,
  getPersistedState,
  delayMs = 260,
  onSaved,
}: UseAutosaveParams): void {
  const timerRef = useRef<number | null>(null)

  const flushSave = useCallback(async () => {
    try {
      await saveState(getPersistedState())
      onSaved?.(Date.now())
    } catch (error) {
      console.error('Autosave failed', error)
    }
  }, [getPersistedState, onSaved])

  useEffect(() => {
    if (!loaded) {
      return
    }

    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }

    timerRef.current = window.setTimeout(() => {
      void flushSave()
    }, delayMs)

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [delayMs, flushSave, loaded, trackedTasks, trackedGroups, trackedSettings])

  useEffect(() => {
    if (!loaded) {
      return
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void flushSave()
      }
    }

    const handleBeforeUnload = () => {
      void flushSave()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [flushSave, loaded])
}
