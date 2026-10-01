import type { MouseEvent } from 'react'
import { Minimize2, Minus, Settings2, X } from 'lucide-react'
import { LogoMark } from './LogoMark'
import { Button } from './ui/Button'

type TitleBarProps = {
  mode: 'floating' | 'full'
  settingsOpen: boolean
  updateAvailable: boolean
  saveStatusLabel: string
  onStartDrag: () => void
  onToggleMode: () => void
  onToggleSettings: () => void
  onMinimize: () => void
  onClose: () => void
  onSnap: () => void
}

export function TitleBar({
  mode: _mode,
  settingsOpen,
  updateAvailable,
  saveStatusLabel,
  onStartDrag,
  onToggleMode,
  onToggleSettings,
  onMinimize,
  onClose,
  onSnap,
}: TitleBarProps) {
  const handleHeaderMouseDown = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('button, input, select, textarea, [data-no-drag="true"]')) {
      return
    }
    event.preventDefault()
    onStartDrag()
  }

  const handleHeaderDoubleClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('button, input, select, textarea, [data-no-drag="true"]')) {
      return
    }
    onSnap()
  }

  return (
    <header className="titlebar" onMouseDown={handleHeaderMouseDown} onDoubleClick={handleHeaderDoubleClick}>
      <div className="titlebar-left">
        <LogoMark className="titlebar-logo" />
        <div className="titlebar-brand">
          <strong>TaskQueue</strong>
          <span>{saveStatusLabel}</span>
        </div>
      </div>

      <div className="titlebar-drag-space" />

      <div className="titlebar-right" data-no-drag="true">
        <Button
          variant="outline"
          size="icon"
          className="titlebar-icon-btn titlebar-mode-btn"
          aria-label="Switch to mini window"
          title="Mini window"
          onClick={onToggleMode}
        >
          <Minimize2 />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="titlebar-icon-btn"
          aria-label="Minimize to Dock"
          title="Minimize to Dock"
          onClick={onMinimize}
        >
          <Minus />
        </Button>
        <Button
          variant={settingsOpen ? 'default' : 'ghost'}
          size="icon"
          aria-label={updateAvailable ? 'Open settings (update available)' : 'Open settings'}
          title={updateAvailable ? 'Update available' : undefined}
          data-settings-trigger="true"
          className={`settings-trigger titlebar-icon-btn ${settingsOpen ? 'active' : ''}`}
          onClick={onToggleSettings}
        >
          <Settings2 />
          {updateAvailable ? <span className="update-dot" aria-hidden="true" /> : null}
        </Button>
        <Button variant="destructive" size="icon" className="titlebar-icon-btn titlebar-close-btn" aria-label="Close window" onClick={onClose}>
          <X />
        </Button>
      </div>
    </header>
  )
}
