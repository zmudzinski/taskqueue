import { useEffect, useState } from 'react'

type UseUpdaterResult = {
  updateVersion: string | null
  dismissUpdate: () => void
  handleInstallUpdate: () => Promise<void>
}

export function useUpdater(): UseUpdaterResult {
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)

  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) {
      return
    }

    let unlisten: (() => void) | undefined

    import('@tauri-apps/api/event')
      .then(({ listen }) =>
        listen<string>('update-available', (event) => setUpdateVersion(event.payload)),
      )
      .then((fn) => {
        unlisten = fn
      })
      .catch((error) => {
        console.error('Could not listen for update events', error)
      })

    return () => {
      unlisten?.()
    }
  }, [])

  const dismissUpdate = () => {
    setUpdateVersion(null)
  }

  const handleInstallUpdate = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('install_update')
    } catch (error) {
      console.error('Update install failed', error)
    }
  }

  return { updateVersion, dismissUpdate, handleInstallUpdate }
}
