import { useEffect, useRef } from 'react'
import { applyStickyMode, applyWindowSize, observeWindowResize } from '../lib/window-manager'
import type { AppSettings } from '../types'

type UseWindowSyncParams = {
  loaded: boolean
  settings: AppSettings
  setWindowSize: (width: number, height: number) => void
}

export function useWindowSync({ loaded, settings, setWindowSize }: UseWindowSyncParams): void {
  const restoredWindowSize = useRef(false)

  useEffect(() => {
    if (!loaded || restoredWindowSize.current) {
      return
    }

    restoredWindowSize.current = true
    applyWindowSize(settings.windowWidth, settings.windowHeight).catch((error) => {
      console.error('Could not restore window size', error)
    })
  }, [loaded, settings.windowHeight, settings.windowWidth])

  useEffect(() => {
    applyStickyMode(settings.stickyMode).catch((error) => {
      console.error('Could not set always on top', error)
    })
  }, [settings.stickyMode])

  useEffect(() => {
    if (!loaded) {
      return
    }

    let debounceTimer: number | null = null
    let stopListening: (() => void) | undefined

    observeWindowResize((width, height) => {
      if (debounceTimer) {
        window.clearTimeout(debounceTimer)
      }

      debounceTimer = window.setTimeout(() => {
        setWindowSize(width, height)
      }, 120)
    })
      .then((unlisten) => {
        stopListening = unlisten
      })
      .catch((error) => {
        console.error('Could not subscribe to resize', error)
      })

    return () => {
      if (debounceTimer) {
        window.clearTimeout(debounceTimer)
      }
      if (stopListening) {
        stopListening()
      }
    }
  }, [loaded, setWindowSize])
}
