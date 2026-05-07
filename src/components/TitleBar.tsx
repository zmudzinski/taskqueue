import type { MouseEvent } from 'react'
import { Minus, Play, Settings2, X } from 'lucide-react'
import { Button } from './ui/Button'

type TitleBarProps = {
  mode: 'floating' | 'full'
  settingsOpen: boolean
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
        <strong>TaskQueue</strong>
        <span>{saveStatusLabel}</span>
      </div>

      <div className="titlebar-drag-space" />

      <div className="titlebar-right" data-no-drag="true">
        <Button variant="outline" size="icon" className="titlebar-icon-btn titlebar-mode-btn" aria-label="Switch to floating mode" onClick={onToggleMode}>
          <Play />
        </Button>
        <Button variant="ghost" size="icon" className="titlebar-icon-btn" aria-label="Minimize window" onClick={onMinimize}>
          <Minus />
        </Button>
        <Button
          variant={settingsOpen ? 'default' : 'ghost'}
          size="icon"
          aria-label="Open settings"
          data-settings-trigger="true"
          className={`settings-trigger titlebar-icon-btn ${settingsOpen ? 'active' : ''}`}
          onClick={onToggleSettings}
        >
          <Settings2 />
        </Button>
        <Button variant="destructive" size="icon" className="titlebar-icon-btn titlebar-close-btn" aria-label="Close window" onClick={onClose}>
          <X />
        </Button>
      </div>
    </header>
  )
}
