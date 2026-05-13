import { create } from 'zustand'
import type { AppSettings, EdgeDockSide, Group, PersistedState, Task, ThemeMode, ViewMode } from '../types'

const defaultSettings: AppSettings = {
  opacity: 0.78,
  windowWidth: 520,
  windowHeight: 420,
  floatingWindowWidth: 390,
  floatingWindowHeight: 168,
  floatingVisibleNextCount: 3,
  stickyMode: true,
  mode: 'floating',
  edgeDockEnabled: false,
  edgeDockSide: 'right',
  hideCompleted: false,
  soundsEnabled: true,
  themeMode: 'system',
}

type HistorySnapshot = {
  tasks: Task[]
  groups: Group[]
}

type QueueStore = {
  tasks: Task[]
  groups: Group[]
  settings: AppSettings
  loaded: boolean
  history: HistorySnapshot[]
  setLoaded: (loaded: boolean) => void
  hydrate: (state: PersistedState) => void
  addTask: (content: string, groupId?: string) => void
  addTasksFromPaste: (raw: string, groupId?: string) => void
  addTaskToSprint: (content: string, groupId?: string) => void
  addTasksToSprintFromPaste: (raw: string, groupId?: string) => void
  addTaskToBacklog: (taskId: string) => void
  toggleTask: (id: string) => void
  updateTask: (id: string, content: string) => void
  removeTask: (id: string) => void
  createGroup: (name: string) => void
  removeGroup: (id: string) => void
  renameGroup: (id: string, name: string) => void
  toggleGroupCollapsed: (id: string) => void
  reorderGroup: (groupId: string, targetGroupId?: string) => void
  reorderTask: (
    taskId: string,
    targetContainer: string,
    targetTaskId?: string,
    targetPosition?: 'before' | 'after',
  ) => void
  setMode: (mode: ViewMode) => void
  toggleMode: () => void
  setOpacity: (opacity: number) => void
  setWindowSize: (width: number, height: number) => void
  setFloatingWindowSize: (width: number, height: number) => void
  setStickyMode: (sticky: boolean) => void
  setEdgeDockEnabled: (enabled: boolean) => void
  setEdgeDockSide: (side: EdgeDockSide) => void
  setHideCompleted: (hide: boolean) => void
  setSoundsEnabled: (enabled: boolean) => void
  setThemeMode: (mode: ThemeMode) => void
  setFloatingVisibleNextCount: (count: number) => void
  clearBacklogMirrors: () => void
  clearCompletedBacklogMirrors: () => void
  clearOpenBacklogMirrors: () => void
  purgeCompleted: () => void
  deleteAllTasks: () => void
  undoLastAction: () => void
  getPersistedState: () => PersistedState
}

const HISTORY_LIMIT = 60

function cloneTasks(tasks: Task[]): Task[] {
  return tasks.map((task) => ({ ...task }))
}

function cloneGroups(groups: Group[]): Group[] {
  return groups.map((group) => ({ ...group }))
}

function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const next = [...array]
  next.splice(to < 0 ? next.length + to : to, 0, next.splice(from, 1)[0])
  return next
}

function createTask(content: string, index: number, groupId?: string, sourceTaskId?: string): Task {
  return {
    id: crypto.randomUUID(),
    content,
    completed: false,
    groupId,
    sourceTaskId,
    order: index,
    createdAt: Date.now(),
  }
}

function createSprintEntries(lines: string[], fromOrder: number, groupId?: string): Task[] {
  const entries: Task[] = []
  let nextOrder = fromOrder

  for (const line of lines) {
    if (!groupId) {
      entries.push(createTask(line, nextOrder))
      nextOrder += 1
      continue
    }

    const sourceTask = createTask(line, nextOrder, groupId)
    nextOrder += 1
    const sprintMirror = createTask(line, nextOrder, undefined, sourceTask.id)
    nextOrder += 1

    entries.push(sourceTask, sprintMirror)
  }

  return entries
}

function normalizeTasks(tasks: Task[], groups: Group[]): Task[] {
  const byContainer = new Map<string, Task[]>()
  byContainer.set('ungrouped', [])
  for (const group of groups) {
    byContainer.set(group.id, [])
  }

  for (const task of [...tasks].sort((a, b) => a.order - b.order)) {
    const key = task.groupId && byContainer.has(task.groupId) ? task.groupId : 'ungrouped'
    const list = byContainer.get(key)
    if (list) {
      list.push({ ...task, groupId: key === 'ungrouped' ? undefined : key })
    }
  }

  const normalized: Task[] = []
  for (const containerId of ['ungrouped', ...groups.map((group) => group.id)]) {
    const list = byContainer.get(containerId)
    if (list) {
      normalized.push(...list)
    }
  }

  return normalized.map((task, index) => ({
    ...task,
    order: index + 1,
  }))
}

function withHistory(state: QueueStore, nextTasks: Task[], nextGroups: Group[]): Pick<QueueStore, 'tasks' | 'groups' | 'history'> {
  const snapshot: HistorySnapshot = {
    tasks: cloneTasks(state.tasks),
    groups: cloneGroups(state.groups),
  }

  return {
    tasks: nextTasks,
    groups: nextGroups,
    history: [...state.history, snapshot].slice(-HISTORY_LIMIT),
  }
}

export const useTaskQueueStore = create<QueueStore>((set, get) => ({
  tasks: [],
  groups: [],
  settings: defaultSettings,
  loaded: false,
  history: [],

  setLoaded: (loaded) => {
    set({ loaded })
  },

  hydrate: (state) => {
    const groups = state.groups ?? []
    const rawTasks = state.tasks ?? []
    const legacyDarkMode = (state.settings as Partial<{ darkMode: boolean }> | undefined)?.darkMode
    const tasks = normalizeTasks(rawTasks, groups)
    set({
      tasks,
      groups,
      history: [],
      settings: {
        ...defaultSettings,
        ...state.settings,
        themeMode: state.settings?.themeMode ?? (legacyDarkMode ? 'dark' : defaultSettings.themeMode),
      },
    })
  },

  addTask: (content, groupId) => {
    const normalized = content.trim()
    if (!normalized) {
      return
    }

    set((state) => {
      const nextTasks = normalizeTasks(
        [...state.tasks, createTask(normalized, state.tasks.length + 1, groupId)],
        state.groups,
      )
      return withHistory(state, nextTasks, state.groups)
    })
  },

  addTasksFromPaste: (raw, groupId) => {
    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    if (!lines.length) {
      return
    }

    set((state) => {
      const fromOrder = state.tasks.length + 1
      const newTasks = lines.map((line, index) => createTask(line, fromOrder + index, groupId))
      const nextTasks = normalizeTasks([...state.tasks, ...newTasks], state.groups)
      return withHistory(state, nextTasks, state.groups)
    })
  },

  addTaskToSprint: (content, groupId) => {
    const normalized = content.trim()
    if (!normalized) {
      return
    }

    set((state) => {
      const nextTasks = normalizeTasks(
        [...state.tasks, ...createSprintEntries([normalized], state.tasks.length + 1, groupId)],
        state.groups,
      )
      return withHistory(state, nextTasks, state.groups)
    })
  },

  addTasksToSprintFromPaste: (raw, groupId) => {
    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    if (!lines.length) {
      return
    }

    set((state) => {
      const nextTasks = normalizeTasks(
        [...state.tasks, ...createSprintEntries(lines, state.tasks.length + 1, groupId)],
        state.groups,
      )
      return withHistory(state, nextTasks, state.groups)
    })
  },

  addTaskToBacklog: (taskId) => {
    set((state) => {
      const sourceTask = state.tasks.find((task) => task.id === taskId)
      if (!sourceTask || sourceTask.completed || !sourceTask.groupId) {
        return state
      }

      const alreadyMirrored = state.tasks.some(
        (task) => task.sourceTaskId === sourceTask.id,
      )

      if (alreadyMirrored) {
        return state
      }

      const mirrorTask = createTask(
        sourceTask.content,
        state.tasks.length + 1,
        undefined,
        sourceTask.id,
      )

      const nextTasks = normalizeTasks([...state.tasks, mirrorTask], state.groups)
      return withHistory(state, nextTasks, state.groups)
    })
  },

  toggleTask: (id) => {
    set((state) => {
      const toggledTask = state.tasks.find((task) => task.id === id)
      if (!toggledTask) {
        return state
      }

      const nextCompleted = !toggledTask.completed

      // Toggling a backlog mirror also toggles its source task, but keeps the mirror in backlog.
      if (toggledTask.sourceTaskId) {
        const nextTasks = normalizeTasks(
          state.tasks
            .map((task) =>
              task.id === id || task.id === toggledTask.sourceTaskId
                ? { ...task, completed: nextCompleted }
                : task,
            ),
          state.groups,
        )
        return withHistory(state, nextTasks, state.groups)
      }

      // Toggling a source task mirrors completion state to its backlog copy.
      const nextTasks = normalizeTasks(
        state.tasks
          .map((task) =>
            task.id === id || task.sourceTaskId === toggledTask.id
              ? { ...task, completed: nextCompleted }
              : task,
          ),
        state.groups,
      )

      return withHistory(state, nextTasks, state.groups)
    })
  },

  updateTask: (id, content) => {
    const normalized = content.trim()
    if (!normalized) {
      return
    }

    set((state) => {
      const nextTasks = state.tasks.map((task) => (task.id === id ? { ...task, content: normalized } : task))
      return withHistory(state, nextTasks, state.groups)
    })
  },

  removeTask: (id) => {
    set((state) => {
      const removingTask = state.tasks.find((task) => task.id === id)
      if (!removingTask) {
        return state
      }

      const nextTasks = normalizeTasks(
        state.tasks.filter((task) => {
          if (task.id === id) {
            return false
          }

          // Removing a source task also removes its backlog mirrors.
          if (!removingTask.sourceTaskId && task.sourceTaskId === id) {
            return false
          }

          return true
        }),
        state.groups,
      )
      return withHistory(state, nextTasks, state.groups)
    })
  },

  createGroup: (name) => {
    const normalized = name.trim()
    if (!normalized) {
      return
    }

    set((state) => {
      const nextGroups = [...state.groups, { id: crypto.randomUUID(), name: normalized, collapsed: false }]
      const nextTasks = normalizeTasks(state.tasks, nextGroups)
      return withHistory(state, nextTasks, nextGroups)
    })
  },

  removeGroup: (id) => {
    set((state) => {
      const exists = state.groups.some((group) => group.id === id)
      if (!exists) {
        return state
      }

      const nextGroups = state.groups.filter((group) => group.id !== id)

      const nextTasks = normalizeTasks(
        state.tasks.map((task) =>
          task.groupId === id ? { ...task, groupId: undefined } : task,
        ),
        nextGroups,
      )

      return withHistory(state, nextTasks, nextGroups)
    })
  },

  renameGroup: (id, name) => {
    const normalized = name.trim()
    if (!normalized) {
      return
    }

    set((state) => {
      const nextGroups = state.groups.map((group) => (group.id === id ? { ...group, name: normalized } : group))
      return withHistory(state, state.tasks, nextGroups)
    })
  },

  toggleGroupCollapsed: (id) => {
    set((state) => {
      const nextGroups = state.groups.map((group) =>
        group.id === id ? { ...group, collapsed: !group.collapsed } : group,
      )
      return withHistory(state, state.tasks, nextGroups)
    })
  },

  reorderGroup: (groupId, targetGroupId) => {
    set((state) => {
      const sourceIndex = state.groups.findIndex((group) => group.id === groupId)
      if (sourceIndex === -1) {
        return state
      }

      const targetIndex =
        targetGroupId == null
          ? state.groups.length - 1
          : state.groups.findIndex((group) => group.id === targetGroupId)

      if (targetIndex === -1 || targetIndex === sourceIndex) {
        return state
      }

      const normalizedGroups = arrayMove(state.groups, sourceIndex, targetIndex)
      const nextTasks = normalizeTasks(state.tasks, normalizedGroups)
      return withHistory(state, nextTasks, normalizedGroups)
    })
  },

  reorderTask: (taskId, targetContainer, targetTaskId, targetPosition = 'after') => {
    set((state) => {
      const movingTask = state.tasks.find((task) => task.id === taskId)
      if (!movingTask) {
        return state
      }

      if (targetTaskId === taskId) {
        return state
      }

      const orderedTasks = [...state.tasks].sort((a, b) => a.order - b.order)
      const containers = new Map<string, Task[]>()
      containers.set('ungrouped', [])
      for (const group of state.groups) {
        containers.set(group.id, [])
      }

      for (const task of orderedTasks) {
        const key = task.groupId && containers.has(task.groupId) ? task.groupId : 'ungrouped'
        const list = containers.get(key)
        if (list) {
          list.push(task)
        }
      }

      const sourceContainer = movingTask.groupId && containers.has(movingTask.groupId) ? movingTask.groupId : 'ungrouped'
      const sourceList = containers.get(sourceContainer)
      const targetList = containers.get(targetContainer)
      if (!sourceList || !targetList) {
        return state
      }

      const sourceIndex = sourceList.findIndex((task) => task.id === taskId)
      if (sourceIndex === -1) {
        return state
      }

      const detached = { ...sourceList[sourceIndex], groupId: targetContainer === 'ungrouped' ? undefined : targetContainer }
      sourceList.splice(sourceIndex, 1)

      const targetIndex = targetTaskId == null ? -1 : targetList.findIndex((task) => task.id === targetTaskId)
      const insertIndex =
        targetIndex >= 0
          ? (targetPosition === 'before' ? targetIndex : targetIndex + 1)
          : targetList.length
      targetList.splice(insertIndex, 0, detached)

      const ordered: Task[] = []
      for (const containerId of ['ungrouped', ...state.groups.map((group) => group.id)]) {
        const list = containers.get(containerId)
        if (list) {
          ordered.push(...list)
        }
      }

      const nextTasks = ordered.map((task, index) => ({ ...task, order: index + 1 }))
      return withHistory(state, nextTasks, state.groups)
    })
  },

  setMode: (mode) => {
    set((state) => ({
      settings: { ...state.settings, mode },
    }))
  },

  toggleMode: () => {
    set((state) => ({
      settings: {
        ...state.settings,
        mode: state.settings.mode === 'floating' ? 'full' : 'floating',
      },
    }))
  },

  setOpacity: (opacity) => {
    set((state) => ({
      settings: {
        ...state.settings,
        opacity,
      },
    }))
  },

  setWindowSize: (width, height) => {
    const nextWidth = Math.max(320, Math.round(width))
    set((state) => ({
      settings: {
        ...state.settings,
        windowWidth: nextWidth,
        windowHeight: Math.round(height),
        floatingWindowWidth: nextWidth,
      },
    }))
  },

  setFloatingWindowSize: (width, height) => {
    const nextWidth = Math.max(320, Math.round(width))
    set((state) => ({
      settings: {
        ...state.settings,
        floatingWindowWidth: nextWidth,
        windowWidth: nextWidth,
        floatingWindowHeight: Math.max(168, Math.round(height)),
      },
    }))
  },

  setStickyMode: (stickyMode) => {
    set((state) => ({
      settings: {
        ...state.settings,
        stickyMode,
      },
    }))
  },

  setEdgeDockEnabled: (edgeDockEnabled) => {
    set((state) => ({
      settings: {
        ...state.settings,
        edgeDockEnabled,
      },
    }))
  },

  setEdgeDockSide: (edgeDockSide) => {
    set((state) => ({
      settings: {
        ...state.settings,
        edgeDockSide,
      },
    }))
  },

  setHideCompleted: (hideCompleted) => {
    set((state) => ({
      settings: {
        ...state.settings,
        hideCompleted,
      },
    }))
  },

  setSoundsEnabled: (soundsEnabled) => {
    set((state) => ({
      settings: {
        ...state.settings,
        soundsEnabled,
      },
    }))
  },

  setThemeMode: (themeMode) => {
    set((state) => ({
      settings: {
        ...state.settings,
        themeMode,
      },
    }))
  },

  setFloatingVisibleNextCount: (floatingVisibleNextCount) => {
    set((state) => ({
      settings: {
        ...state.settings,
        floatingVisibleNextCount: Math.max(2, Math.min(8, Math.round(floatingVisibleNextCount))),
      },
    }))
  },

  clearBacklogMirrors: () => {
    set((state) => {
      const nextTasks = normalizeTasks(
        state.tasks.filter((task) => !task.sourceTaskId),
        state.groups,
      )
      return withHistory(state, nextTasks, state.groups)
    })
  },

  clearCompletedBacklogMirrors: () => {
    set((state) => {
      const nextTasks = normalizeTasks(
        state.tasks.filter((task) => !(task.sourceTaskId && task.completed)),
        state.groups,
      )
      return withHistory(state, nextTasks, state.groups)
    })
  },

  clearOpenBacklogMirrors: () => {
    set((state) => {
      const nextTasks = normalizeTasks(
        state.tasks.filter((task) => !(task.sourceTaskId && !task.completed)),
        state.groups,
      )
      return withHistory(state, nextTasks, state.groups)
    })
  },

  purgeCompleted: () => {
    set((state) => {
      const nextTasks = normalizeTasks(
        state.tasks.filter((task) => !task.completed),
        state.groups,
      )
      return withHistory(state, nextTasks, state.groups)
    })
  },

  deleteAllTasks: () => {
    set((state) => {
      return withHistory(state, [], [])
    })
  },

  undoLastAction: () => {
    set((state) => {
      const snapshot = state.history.at(-1)
      if (!snapshot) {
        return state
      }

      return {
        tasks: cloneTasks(snapshot.tasks),
        groups: cloneGroups(snapshot.groups),
        history: state.history.slice(0, -1),
      }
    })
  },

  getPersistedState: () => {
    const state = get()
    return {
      tasks: state.tasks,
      groups: state.groups,
      settings: state.settings,
    }
  },
}))
