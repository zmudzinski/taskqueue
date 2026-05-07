import { useEffect, useRef } from 'react'
import { applyWindowSize } from '../lib/window-manager'
import type { ViewMode } from '../types'

type UseModeTransitionParams = {
  loaded: boolean
  mode: ViewMode
  windowWidth: number
  windowHeight: number
}

export function useModeTransition({ loaded, mode, windowWidth, windowHeight }: UseModeTransitionParams): void {
  const lastModeRef = useRef(mode)
  const fullModeSizeRef = useRef<{ width: number; height: number } | null>(null)

  useEffect(() => {
    if (!loaded) {
      return
    }

    if (lastModeRef.current !== 'floating' && mode === 'floating') {
      fullModeSizeRef.current = { width: windowWidth, height: windowHeight }
      applyWindowSize(440, 320).catch((error) => {
        console.error('Could not resize floating mode', error)
      })
    }

    if (lastModeRef.current === 'floating' && mode !== 'floating') {
      const previousFullSize = fullModeSizeRef.current
      if (previousFullSize) {
        applyWindowSize(previousFullSize.width, previousFullSize.height).catch((error) => {
          console.error('Could not restore full mode size', error)
        })
      }
    }

    lastModeRef.current = mode
  }, [loaded, mode, windowWidth, windowHeight])
}
