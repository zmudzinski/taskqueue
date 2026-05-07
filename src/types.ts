export type Task = {
  id: string
  content: string
  completed: boolean
  groupId?: string
  sourceTaskId?: string
  order: number
  createdAt: number
}

export type Group = {
  id: string
  name: string
  collapsed: boolean
}

export type ViewMode = 'floating' | 'full'
export type ThemeMode = 'light' | 'dark' | 'system'

export type AppSettings = {
  opacity: number
  windowWidth: number
  windowHeight: number
  floatingWindowWidth: number
  floatingWindowHeight: number
  floatingVisibleNextCount: number
  stickyMode: boolean
  mode: ViewMode
  hideCompleted: boolean
  soundsEnabled: boolean
  themeMode: ThemeMode
}

export type PersistedState = {
  tasks: Task[]
  groups: Group[]
  settings: AppSettings
}

export type ConfirmRequest = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
}
