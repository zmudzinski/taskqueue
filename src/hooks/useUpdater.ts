import { useCallback, useEffect, useState } from 'react'

type UseUpdaterResult = {
  updateVersion: string | null
  isChecking: boolean
  upToDate: boolean
  checkForUpdates: () => Promise<void>
  handleInstallUpdate: () => Promise<void>
}

export function useUpdater(): UseUpdaterResult {
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [upToDate, setUpToDate] = useState(false)

  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) {
      console.log('[Updater] Tauri not detected, skipping update check')
      return
    }

    console.log('[Updater] Initializing update listener')
    let unlisten: (() => void) | undefined

    import('@tauri-apps/api/event')
      .then(({ listen }) => {
        console.log('[Updater] Registering update-available listener')
        return listen<string>('update-available', (event) => {
          console.log('[Updater] Update available:', event.payload)
          setUpdateVersion(event.payload)
          setUpToDate(false)
        })
      })
      .then((fn) => {
        unlisten = fn
        console.log('[Updater] Listener registered successfully')
      })
      .catch((error) => {
        console.error('[Updater] Failed to listen for update events', error)
      })

    return () => {
      unlisten?.()
    }
  }, [])

  const checkForUpdates = useCallback(async () => {
    if (!('__TAURI_INTERNALS__' in window)) return
    setIsChecking(true)
    setUpToDate(false)
    setUpdateVersion(null)
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const version = await invoke<string | null>('check_for_update')
      if (version) {
        // Fallback for cases where event delivery is delayed or missed.
        setUpdateVersion(version)
        return
      }

      if (!version) {
        setUpToDate(true)
        setTimeout(() => setUpToDate(false), 4000)
      }
    } catch (error) {
      console.error('[Updater] Manual check failed:', error)
    } finally {
      setIsChecking(false)
    }
  }, [])

  const handleInstallUpdate = useCallback(async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('install_update')
    } catch (error) {
      console.error('Update install failed', error)
    }
  }, [])

  return { updateVersion, isChecking, upToDate, checkForUpdates, handleInstallUpdate }
}
