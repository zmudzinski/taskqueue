import type { MouseEvent } from 'react'
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
  mode,
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
        <Button variant="outline" size="sm" onClick={onToggleMode}>
          {mode === 'floating' ? 'List' : 'Play'}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Minimize window" onClick={onMinimize}>
          -
        </Button>
        <Button
          variant={settingsOpen ? 'default' : 'ghost'}
          size="icon"
          aria-label="Open settings"
          className={`settings-trigger ${settingsOpen ? 'active' : ''}`}
          onClick={onToggleSettings}
        >
          ⚙
        </Button>
        <Button variant="destructive" size="icon" aria-label="Close window" onClick={onClose}>
          ×
        </Button>
      </div>
    </header>
  )
}
