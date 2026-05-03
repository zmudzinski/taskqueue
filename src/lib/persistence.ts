import { invoke } from '@tauri-apps/api/core'
import type { PersistedState } from '../types'

export async function saveState(state: PersistedState): Promise<void> {
  await invoke('save_state', {
    json: JSON.stringify(state),
  })
}

export async function loadState(): Promise<PersistedState | null> {
  const payload = await invoke<string | null>('load_state')
  if (!payload) {
    return null
  }

  const parsed = JSON.parse(payload) as PersistedState
  return parsed
}
