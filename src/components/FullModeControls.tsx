import { SettingsMenu } from './SettingsMenu'
import { TitleBar } from './TitleBar'
import type { AppSettings, ThemeMode } from '../types'

type FullModeControlsProps = {
  appVersion: string
  settings: AppSettings
  settingsOpen: boolean
  settingsMenuRef: React.RefObject<HTMLElement | null>
  lastSavedLabel: string
  updateVersion: string | null
  isChecking: boolean
  upToDate: boolean
  onStartDrag: () => void
  onToggleMode: () => void
  onToggleSettings: () => void
  onMinimize: () => void
  onClose: () => void
  onSnap: () => void
  onOpacityChange: (opacity: number) => void
  onStickyChange: (sticky: boolean) => void
  onEdgeDockEnabledChange: (enabled: boolean) => void
  onEdgeDockSideChange: (side: 'left' | 'right') => void
  onHideCompletedChange: (hide: boolean) => void
  onSoundsEnabledChange: (enabled: boolean) => void
  onThemeModeChange: (mode: ThemeMode) => void
  onFloatingVisibleNextCountChange: (count: number) => void
  onDeleteCompleted: () => void
  onDeleteAll: () => void
  onCheckForUpdates: () => Promise<void>
  onInstallUpdate: () => Promise<void>
}

export function FullModeControls({
  appVersion,
  settings,
  settingsOpen,
  settingsMenuRef,
  lastSavedLabel,
  updateVersion,
  isChecking,
  upToDate,
  onStartDrag,
  onToggleMode,
  onToggleSettings,
  onMinimize,
  onClose,
  onSnap,
  onOpacityChange,
  onStickyChange,
  onEdgeDockEnabledChange,
  onEdgeDockSideChange,
  onHideCompletedChange,
  onSoundsEnabledChange,
  onThemeModeChange,
  onFloatingVisibleNextCountChange,
  onDeleteCompleted,
  onDeleteAll,
  onCheckForUpdates,
  onInstallUpdate,
}: FullModeControlsProps) {
  return (
    <>
      <TitleBar
        mode={settings.mode}
        settingsOpen={settingsOpen}
        saveStatusLabel={lastSavedLabel}
        onStartDrag={onStartDrag}
        onToggleMode={onToggleMode}
        onToggleSettings={onToggleSettings}
        onMinimize={onMinimize}
        onClose={onClose}
        onSnap={onSnap}
      />

      <SettingsMenu
        isOpen={settingsOpen}
        menuRef={settingsMenuRef}
        appVersion={appVersion}
        opacity={settings.opacity}
        stickyMode={settings.stickyMode}
        edgeDockEnabled={settings.edgeDockEnabled}
        edgeDockSide={settings.edgeDockSide}
        hideCompleted={settings.hideCompleted}
        soundsEnabled={settings.soundsEnabled}
        themeMode={settings.themeMode}
        floatingVisibleNextCount={settings.floatingVisibleNextCount}
        onOpacityChange={onOpacityChange}
        onStickyChange={onStickyChange}
        onEdgeDockEnabledChange={onEdgeDockEnabledChange}
        onEdgeDockSideChange={onEdgeDockSideChange}
        onHideCompletedChange={onHideCompletedChange}
        onSoundsEnabledChange={onSoundsEnabledChange}
        onThemeModeChange={onThemeModeChange}
        onFloatingVisibleNextCountChange={onFloatingVisibleNextCountChange}
        onDeleteCompleted={onDeleteCompleted}
        onDeleteAll={onDeleteAll}
        updateVersion={updateVersion}
        isChecking={isChecking}
        upToDate={upToDate}
        onCheckForUpdates={onCheckForUpdates}
        onInstallUpdate={onInstallUpdate}
      />
    </>
  )
}
