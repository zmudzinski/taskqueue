import { useCallback, useEffect, useRef } from 'react'
import { closeWindow } from '../lib/window-manager'
import type { ConfirmRequest } from '../types'

type UseCloseRequestParams = {
  setConfirmRequest: (request: ConfirmRequest | null) => void
}

type UseCloseRequestResult = {
  closeApp: () => void
}

export function useCloseRequest({ setConfirmRequest }: UseCloseRequestParams): UseCloseRequestResult {
  const unlistenRef = useRef<(() => void) | undefined>(undefined)

  const closeApp = useCallback(() => {
    unlistenRef.current?.()
    unlistenRef.current = undefined
    closeWindow().catch((error) => {
      console.error('Could not close window', error)
    })
  }, [])

  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) {
      return
    }

    let cancelled = false

    import('@tauri-apps/api/window')
      .then(({ getCurrentWindow }) =>
        getCurrentWindow().onCloseRequested((event) => {
          event.preventDefault()
          setConfirmRequest({
            title: 'Close app',
            message: 'Are you sure you want to close TaskQueue?',
            confirmLabel: 'Close',
            destructive: true,
            onConfirm: closeApp,
          })
        }),
      )
      .then((dispose) => {
        if (cancelled) {
          dispose()
        } else {
          unlistenRef.current = dispose
        }
      })
      .catch((error) => {
        console.error('Close request listener failed', error)
      })

    return () => {
      cancelled = true
      unlistenRef.current?.()
      unlistenRef.current = undefined
    }
  }, [setConfirmRequest, closeApp])

  return { closeApp }
}
