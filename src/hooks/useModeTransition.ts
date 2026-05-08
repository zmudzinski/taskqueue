import { useEffect, useRef } from 'react'
import { applyWindowPosition, applyWindowSize, getWindowPosition } from '../lib/window-manager'
import type { ViewMode } from '../types'

type UseModeTransitionParams = {
  loaded: boolean
  mode: ViewMode
  windowWidth: number
  windowHeight: number
  floatingWindowHeight: number
}

export function useModeTransition({
  loaded,
  mode,
  windowWidth,
  windowHeight,
  floatingWindowHeight,
}: UseModeTransitionParams): void {
  const lastModeRef = useRef(mode)
  const fullModeSizeRef = useRef<{ width: number; height: number } | null>(null)
  const fullModePositionRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!loaded) {
      return
    }

    let cancelled = false
    const runTransition = async () => {
      if (lastModeRef.current !== 'floating' && mode === 'floating') {
        fullModeSizeRef.current = { width: windowWidth, height: windowHeight }
        try {
          fullModePositionRef.current = await getWindowPosition()
        } catch (error) {
          console.error('Could not capture full mode position', error)
        }

        if (!cancelled) {
          applyWindowSize(windowWidth, floatingWindowHeight).catch((error) => {
            console.error('Could not resize floating mode', error)
          })
        }
      }

      if (lastModeRef.current === 'floating' && mode !== 'floating') {
        const previousFullSize = fullModeSizeRef.current
        const previousFullPosition = fullModePositionRef.current

        if (previousFullSize) {
          await applyWindowSize(previousFullSize.width, previousFullSize.height).catch((error) => {
            console.error('Could not restore full mode size', error)
          })
        }

        if (previousFullPosition) {
          await applyWindowPosition(previousFullPosition.x, previousFullPosition.y).catch((error) => {
            console.error('Could not restore full mode position', error)
          })
        }
      }

      lastModeRef.current = mode
    }

    runTransition().catch((error) => {
      console.error('Mode transition failed', error)
    })

    return () => {
      cancelled = true
    }
  }, [loaded, mode, windowWidth, windowHeight, floatingWindowHeight])
}
