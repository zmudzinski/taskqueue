export type Task = {
  id: string
  content: string
  completed: boolean
  groupId?: string
  order: number
  createdAt: number
}

export type Group = {
  id: string
  name: string
  collapsed: boolean
}

export type ViewMode = 'floating' | 'full'

export type AppSettings = {
  opacity: number
  windowWidth: number
  windowHeight: number
  stickyMode: boolean
  mode: ViewMode
  completedCollapsed: boolean
}

export type PersistedState = {
  tasks: Task[]
  groups: Group[]
  settings: AppSettings
}
