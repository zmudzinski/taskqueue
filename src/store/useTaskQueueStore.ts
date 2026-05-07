import { create } from 'zustand'
import type { AppSettings, Group, PersistedState, Task, ViewMode } from '../types'

const PRIMARY_GROUP_ID = 'primary-today'
const PRIMARY_GROUP_NAME = 'Today'

function createPrimaryGroup(): Group {
  return {
    id: PRIMARY_GROUP_ID,
    name: PRIMARY_GROUP_NAME,
    collapsed: false,
  }
}

function ensurePrimaryGroup(groups: Group[]): Group[] {
  const primaryIndex = groups.findIndex((group) => group.id === PRIMARY_GROUP_ID)

  if (primaryIndex === -1) {
    return [createPrimaryGroup(), ...groups]
  }

  const next = [...groups]
  const [primary] = next.splice(primaryIndex, 1)
  next.unshift(primary)
  return next
}

const defaultSettings: AppSettings = {
  opacity: 0.78,
  windowWidth: 520,
  windowHeight: 420,
  stickyMode: true,
  mode: 'floating',
  hideCompleted: false,
  soundsEnabled: true,
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
  addTaskToBacklog: (taskId: string) => void
  toggleTask: (id: string) => void
  updateTask: (id: string, content: string) => void
  removeTask: (id: string) => void
  createGroup: (name: string) => void
  removeGroup: (id: string) => void
  renameGroup: (id: string, name: string) => void
  toggleGroupCollapsed: (id: string) => void
  reorderGroup: (groupId: string, targetGroupId?: string) => void
  reorderTask: (taskId: string, targetContainer: string, targetTaskId?: string) => void
  setMode: (mode: ViewMode) => void
  toggleMode: () => void
  setOpacity: (opacity: number) => void
  setWindowSize: (width: number, height: number) => void
  setStickyMode: (sticky: boolean) => void
  setHideCompleted: (hide: boolean) => void
  setSoundsEnabled: (enabled: boolean) => void
  purgeCompleted: () => void
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
  groups: [createPrimaryGroup()],
  settings: defaultSettings,
  loaded: false,
  history: [],

  setLoaded: (loaded) => {
    set({ loaded })
  },

  hydrate: (state) => {
    const groups = ensurePrimaryGroup(state.groups ?? [])
    // Discard any lingering orphan tasks (no group and not a backlog mirror).
    const rawTasks = (state.tasks ?? []).filter((t) => t.groupId || t.sourceTaskId)
    const tasks = normalizeTasks(rawTasks, groups)
    set({
      tasks,
      groups,
      history: [],
      settings: {
        ...defaultSettings,
        ...state.settings,
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

  addTaskToBacklog: (taskId) => {
    set((state) => {
      const sourceTask = state.tasks.find((task) => task.id === taskId)
      if (!sourceTask || sourceTask.completed || !sourceTask.groupId) {
        return state
      }

      const alreadyMirrored = state.tasks.some(
        (task) => task.sourceTaskId === sourceTask.id && !task.completed,
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

      // Completing a backlog mirror marks its source task done and removes the mirror.
      if (toggledTask.sourceTaskId && !toggledTask.completed) {
        const nextTasks = normalizeTasks(
          state.tasks
            .filter((task) => task.id !== id)
            .map((task) =>
              task.id === toggledTask.sourceTaskId ? { ...task, completed: true } : task,
            ),
          state.groups,
        )
        return withHistory(state, nextTasks, state.groups)
      }

      const nextCompleted = !toggledTask.completed

      const nextTasks = normalizeTasks(
        state.tasks
          .filter((task) => !(nextCompleted && task.sourceTaskId === toggledTask.id))
          .map((task) => (task.id === id ? { ...task, completed: nextCompleted } : task)),
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
      const nextGroups = ensurePrimaryGroup([...state.groups, { id: crypto.randomUUID(), name: normalized, collapsed: false }])
      const nextTasks = normalizeTasks(state.tasks, nextGroups)
      return withHistory(state, nextTasks, nextGroups)
    })
  },

  removeGroup: (id) => {
    set((state) => {
      if (id === PRIMARY_GROUP_ID) {
        return state
      }

      const exists = state.groups.some((group) => group.id === id)
      if (!exists) {
        return state
      }

      const nextGroups = ensurePrimaryGroup(state.groups.filter((group) => group.id !== id))

      const nextTasks = normalizeTasks(
        state.tasks.map((task) =>
          task.groupId === id ? { ...task, groupId: PRIMARY_GROUP_ID } : task,
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
      if (groupId === PRIMARY_GROUP_ID) {
        return state
      }

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

      const normalizedGroups = ensurePrimaryGroup(arrayMove(state.groups, sourceIndex, targetIndex))
      const nextTasks = normalizeTasks(state.tasks, normalizedGroups)
      return withHistory(state, nextTasks, normalizedGroups)
    })
  },

  reorderTask: (taskId, targetContainer, targetTaskId) => {
    set((state) => {
      const movingTask = state.tasks.find((task) => task.id === taskId)
      if (!movingTask) {
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
      const insertIndex = targetIndex >= 0 ? targetIndex : targetList.length
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
    set((state) => ({
      settings: {
        ...state.settings,
        windowWidth: Math.round(width),
        windowHeight: Math.round(height),
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

  purgeCompleted: () => {
    set((state) => {
      const nextTasks = normalizeTasks(
        state.tasks.filter((task) => !task.completed),
        state.groups,
      )
      return withHistory(state, nextTasks, state.groups)
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
