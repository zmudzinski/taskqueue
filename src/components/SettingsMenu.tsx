import type { RefObject } from 'react'
import { Card } from './ui/Card'
import { Separator } from './ui/Separator'
import { Switch } from './ui/Switch'

type SettingsMenuProps = {
  isOpen: boolean
  menuRef?: RefObject<HTMLElement | null>
  appVersion: string
  opacity: number
  stickyMode: boolean
  onOpacityChange: (opacity: number) => void
  onStickyChange: (sticky: boolean) => void
}

export function SettingsMenu({
  isOpen,
  menuRef,
  appVersion,
  opacity,
  stickyMode,
  onOpacityChange,
  onStickyChange,
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
