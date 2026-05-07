import { useEffect } from 'react'
import { saveState } from '../lib/persistence'
import { toggleWindowVisibility } from '../lib/window-manager'
import type { PersistedState } from '../types'

type UseGlobalShortcutsParams = {
  getPersistedState: () => PersistedState
  undoLastAction: () => void
}

function isTextInputFocused(): boolean {
  const element = document.activeElement
  if (!element) {
    return false
  }

  const tag = element.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || (element as HTMLElement).isContentEditable
}

export function useGlobalShortcuts({ getPersistedState, undoLastAction }: UseGlobalShortcutsParams): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      if (!mod) {
        return
      }

      const key = event.key.toLowerCase()

      if (key === 's' && event.shiftKey) {
        event.preventDefault()
        toggleWindowVisibility().catch((error) => {
          console.error('Could not toggle window visibility', error)
        })
        return
      }

      if (key === 's' && !event.shiftKey) {
        event.preventDefault()
        saveState(getPersistedState()).catch((error) => {
          console.error('Manual save failed', error)
        })
        return
      }

      if (key === 'z' && !event.shiftKey && !event.altKey && !isTextInputFocused()) {
        event.preventDefault()
        undoLastAction()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [getPersistedState, undoLastAction])
}
