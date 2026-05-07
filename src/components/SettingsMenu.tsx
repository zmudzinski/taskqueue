import type { RefObject } from 'react'
import { Card } from './ui/Card'
import { Separator } from './ui/Separator'
import { Switch } from './ui/Switch'
import { Button } from './ui/Button'

type SettingsMenuProps = {
  isOpen: boolean
  menuRef?: RefObject<HTMLElement | null>
  appVersion: string
  opacity: number
  stickyMode: boolean
  hideCompleted: boolean
  soundsEnabled: boolean
  onOpacityChange: (opacity: number) => void
  onStickyChange: (sticky: boolean) => void
  onHideCompletedChange: (hide: boolean) => void
  onSoundsEnabledChange: (enabled: boolean) => void
  onDeleteCompleted: () => void
}

export function SettingsMenu({
  isOpen,
  menuRef,
  appVersion,
  opacity,
  stickyMode,
  hideCompleted,
  soundsEnabled,
  onOpacityChange,
  onStickyChange,
  onHideCompletedChange,
  onSoundsEnabledChange,
  onDeleteCompleted,
}: SettingsMenuProps) {
  if (!isOpen) {
    return null
  }

  return (
    <Card ref={menuRef} className="settings-menu">
      <h3>Settings</h3>

      <label>
        Window opacity {Math.round(opacity * 100)}%
        <input
          type="range"
          min={35}
          max={100}
          value={Math.round(opacity * 100)}
          onChange={(event) => onOpacityChange(Number(event.target.value) / 100)}
        />
      </label>

      <div className="settings-switch-row">
        <span>Keep always on top</span>
        <Switch checked={stickyMode} onCheckedChange={onStickyChange} ariaLabel="Keep always on top" />
      </div>

      <div className="settings-switch-row">
        <span>Hide completed tasks</span>
        <Switch checked={hideCompleted} onCheckedChange={onHideCompletedChange} ariaLabel="Hide completed tasks" />
      </div>

      <div className="settings-switch-row">
        <span>Sound effects</span>
        <Switch checked={soundsEnabled} onCheckedChange={onSoundsEnabledChange} ariaLabel="Sound effects" />
      </div>

      <Separator />

      <Button variant="destructive" size="sm" className="settings-purge-btn" onClick={onDeleteCompleted}>
        Delete completed tasks
      </Button>

      <Separator />
      <div className="settings-help">
        <p>Cmd/Ctrl + S saves now</p>
        <p>Cmd/Ctrl + Shift + S hides window</p>
        <p>Cmd/Ctrl + Z restores last queue edit</p>
      </div>

      <Separator />
      <p className="settings-version">Version {appVersion}</p>
    </Card>
  )
}
