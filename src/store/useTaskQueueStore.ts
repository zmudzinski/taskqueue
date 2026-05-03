import { create } from 'zustand'
import type { AppSettings, Group, PersistedState, Task, ViewMode } from '../types'

const defaultSettings: AppSettings = {
  opacity: 0.93,
  windowWidth: 520,
  windowHeight: 420,
  stickyMode: true,
  mode: 'floating',
  completedCollapsed: true,
}

type QueueStore = {
  tasks: Task[]
  groups: Group[]
  settings: AppSettings
  inputValue: string
  groupDraft: string
  loaded: boolean
  setLoaded: (loaded: boolean) => void
  hydrate: (state: PersistedState) => void
  setInputValue: (value: string) => void
  setGroupDraft: (value: string) => void
  addTask: (content: string, groupId?: string) => void
  addTasksFromPaste: (raw: string) => void
  toggleTask: (id: string) => void
  updateTask: (id: string, content: string) => void
  removeTask: (id: string) => void
  createGroup: (name?: string) => void
  renameGroup: (id: string, name: string) => void
  toggleGroupCollapsed: (id: string) => void
  reorderTask: (taskId: string, targetContainer: string, targetTaskId?: string) => void
  setTaskGroup: (taskId: string, groupId?: string) => void
  setMode: (mode: ViewMode) => void
  toggleMode: () => void
  setOpacity: (opacity: number) => void
  setWindowWidth: (width: number) => void
  setWindowHeight: (height: number) => void
  setStickyMode: (sticky: boolean) => void
  toggleCompletedCollapsed: () => void
  getPersistedState: () => PersistedState
}

function createTask(content: string, index: number, groupId?: string): Task {
  return {
    id: crypto.randomUUID(),
    content,
    completed: false,
    groupId,
    order: index,
    createdAt: Date.now(),
  }
}

function normalizeTasks(tasks: Task[], groups: Group[]): Task[] {
  const activeByContainer = new Map<string, Task[]>()
  activeByContainer.set('ungrouped', [])
  for (const group of groups) {
    activeByContainer.set(group.id, [])
  }

  const completed = tasks
    .filter((task) => task.completed)
    .sort((a, b) => a.order - b.order)

  for (const task of tasks
    .filter((task) => !task.completed)
    .sort((a, b) => a.order - b.order)) {
    const key = task.groupId && activeByContainer.has(task.groupId) ? task.groupId : 'ungrouped'
    const list = activeByContainer.get(key)
    if (list) {
      list.push({ ...task, groupId: key === 'ungrouped' ? undefined : key })
    }
  }

  const normalized: Task[] = []
  const orderedContainers = ['ungrouped', ...groups.map((group) => group.id)]
  for (const containerId of orderedContainers) {
    const list = activeByContainer.get(containerId)
    if (!list) {
      continue
    }
    normalized.push(...list)
  }

  normalized.push(...completed)

  return normalized.map((task, index) => ({
    ...task,
    order: index + 1,
  }))
}

export const useTaskQueueStore = create<QueueStore>((set, get) => ({
  tasks: [],
  groups: [],
  settings: defaultSettings,
  inputValue: '',
  groupDraft: '',
  loaded: false,

  setLoaded: (loaded) => {
    set({ loaded })
  },

  hydrate: (state) => {
    const groups = state.groups ?? []
    const tasks = normalizeTasks(state.tasks ?? [], groups)
    set({
      tasks,
      groups,
      settings: {
        ...defaultSettings,
        ...state.settings,
      },
    })
  },

  setInputValue: (inputValue) => set({ inputValue }),

  setGroupDraft: (groupDraft) => set({ groupDraft }),

  addTask: (content, groupId) => {
    const normalized = content.trim()
    if (!normalized) {
      return
    }

    set((state) => ({
      tasks: normalizeTasks(
        [...state.tasks, createTask(normalized, state.tasks.length + 1, groupId)],
        state.groups,
      ),
      inputValue: '',
    }))
  },

  addTasksFromPaste: (raw) => {
    const chunks = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    if (!chunks.length) {
      return
    }

    set((state) => {
      const startingIndex = state.tasks.length + 1
      const appended = chunks.map((chunk, index) => createTask(chunk, startingIndex + index))

      return {
        tasks: normalizeTasks([...state.tasks, ...appended], state.groups),
      }
    })
  },

  toggleTask: (id) => {
    set((state) => ({
      tasks: normalizeTasks(
        state.tasks.map((task) =>
          task.id === id
            ? {
                ...task,
                completed: !task.completed,
              }
            : task,
        ),
        state.groups,
      ),
    }))
  },

  updateTask: (id, content) => {
    const normalized = content.trim()
    if (!normalized) {
      return
    }

    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              content: normalized,
            }
          : task,
      ),
    }))
  },

  removeTask: (id) => {
    set((state) => ({
      tasks: normalizeTasks(
        state.tasks.filter((task) => task.id !== id),
        state.groups,
      ),
    }))
  },

  createGroup: (name) => {
    const proposedName = (name ?? get().groupDraft).trim()
    if (!proposedName) {
      return
    }

    const newGroup: Group = {
      id: crypto.randomUUID(),
      name: proposedName,
      collapsed: false,
    }

    set((state) => ({
      groups: [...state.groups, newGroup],
      groupDraft: '',
      tasks: normalizeTasks(state.tasks, [...state.groups, newGroup]),
    }))
  },

  renameGroup: (id, name) => {
    const normalized = name.trim()
    if (!normalized) {
      return
    }

    set((state) => ({
      groups: state.groups.map((group) =>
        group.id === id
          ? {
              ...group,
              name: normalized,
            }
          : group,
      ),
    }))
  },

  toggleGroupCollapsed: (id) => {
    set((state) => ({
      groups: state.groups.map((group) =>
        group.id === id
          ? {
              ...group,
              collapsed: !group.collapsed,
            }
          : group,
      ),
    }))
  },

  reorderTask: (taskId, targetContainer, targetTaskId) => {
    set((state) => {
      const movingTask = state.tasks.find((task) => task.id === taskId)
      if (!movingTask || movingTask.completed) {
        return state
      }

      const activeTasks = state.tasks
        .filter((task) => !task.completed)
        .sort((a, b) => a.order - b.order)

      const containers = new Map<string, Task[]>()
      containers.set('ungrouped', [])
      for (const group of state.groups) {
        containers.set(group.id, [])
      }

      for (const task of activeTasks) {
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

      const [detached] = sourceList.splice(sourceIndex, 1)

      const insertIndex =
        targetTaskId != null
          ? Math.max(
              0,
              targetList.findIndex((task) => task.id === targetTaskId),
            )
          : targetList.length

      targetList.splice(insertIndex, 0, {
        ...detached,
        groupId: targetContainer === 'ungrouped' ? undefined : targetContainer,
      })

      const ordered: Task[] = []
      const orderContainers = ['ungrouped', ...state.groups.map((group) => group.id)]
      for (const containerId of orderContainers) {
        const list = containers.get(containerId)
        if (list) {
          ordered.push(...list)
        }
      }

      ordered.push(...state.tasks.filter((task) => task.completed).sort((a, b) => a.order - b.order))

      return {
        tasks: ordered.map((task, index) => ({
          ...task,
          order: index + 1,
        })),
      }
    })
  },

  setTaskGroup: (taskId, groupId) => {
    set((state) => ({
      tasks: normalizeTasks(
        state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                groupId,
              }
            : task,
        ),
        state.groups,
      ),
    }))
  },

  setMode: (mode) => {
    set((state) => ({
      settings: {
        ...state.settings,
        mode,
      },
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

  setWindowWidth: (windowWidth) => {
    set((state) => ({
      settings: {
        ...state.settings,
        windowWidth,
      },
    }))
  },

  setWindowHeight: (windowHeight) => {
    set((state) => ({
      settings: {
        ...state.settings,
        windowHeight,
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

  toggleCompletedCollapsed: () => {
    set((state) => ({
      settings: {
        ...state.settings,
        completedCollapsed: !state.settings.completedCollapsed,
      },
    }))
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
