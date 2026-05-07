import { useEffect } from 'react'
import { closeWindow } from '../lib/window-manager'
import type { ConfirmRequest } from '../types'

type UseCloseRequestParams = {
  setConfirmRequest: (request: ConfirmRequest | null) => void
}

export function useCloseRequest({ setConfirmRequest }: UseCloseRequestParams): void {
  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) {
      return
    }

    let unlockedClose = false
    let unlisten: (() => void) | undefined

    import('@tauri-apps/api/window')
      .then(({ getCurrentWindow }) =>
        getCurrentWindow().onCloseRequested((event) => {
          if (unlockedClose) {
            return
          }

          event.preventDefault()
          setConfirmRequest({
            title: 'Close app',
            message: 'Are you sure you want to close TaskQueue?',
            confirmLabel: 'Close',
            destructive: true,
            onConfirm: () => {
              unlockedClose = true
              closeWindow().catch((error) => {
                console.error('Could not close window', error)
                unlockedClose = false
              })
            },
          })
        }),
      )
      .then((dispose) => {
        unlisten = dispose
      })
      .catch((error) => {
        console.error('Close request listener failed', error)
      })

    return () => {
      unlisten?.()
    }
  }, [setConfirmRequest])
}
