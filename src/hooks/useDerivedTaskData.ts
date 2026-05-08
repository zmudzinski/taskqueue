import { useMemo } from 'react'
import type { Group, Task } from '../types'

type UseDerivedTaskDataParams = {
  tasks: Task[]
  groups: Group[]
  hideCompleted: boolean
  promotedTaskId: string | null
}

type UseDerivedTaskDataResult = {
  sortedTasks: Task[]
  taskMap: Map<string, Task>
  groupNameMap: Map<string, string>
  floatingTasks: Task[]
  backlogSourceTaskIds: Set<string>
  backlogMirrorBySourceId: Map<string, string>
  ungroupedTaskIds: string[]
  groupTaskIds: Map<string, string[]>
  groupProgress: Map<string, { done: number; total: number }>
}

export function useDerivedTaskData({
  tasks,
  groups,
  hideCompleted,
  promotedTaskId,
}: UseDerivedTaskDataParams): UseDerivedTaskDataResult {
  const sortedTasks = useMemo(() => [...tasks].sort((a, b) => a.order - b.order), [tasks])

  const taskMap = useMemo(
    () => new Map(sortedTasks.map((task) => [task.id, task])),
    [sortedTasks],
  )

  const groupNameMap = useMemo(
    () => new Map(groups.map((group) => [group.id, group.name])),
    [groups],
  )

  const floatingTasks = useMemo(() => {
    const openTasks = sortedTasks.filter((task) => !task.completed && !task.groupId)
    if (!promotedTaskId) {
      return openTasks
    }

    const promotedIndex = openTasks.findIndex((task) => task.id === promotedTaskId)
    if (promotedIndex <= 0) {
      return openTasks
    }

    const promoted = openTasks[promotedIndex]
    const rest = openTasks.filter((task) => task.id !== promotedTaskId)
    return [promoted, ...rest]
  }, [promotedTaskId, sortedTasks])

  const backlogSourceTaskIds = useMemo(
    () =>
      new Set(
        sortedTasks
          .filter((task) => task.sourceTaskId)
          .map((task) => task.sourceTaskId as string),
      ),
    [sortedTasks],
  )

  const backlogMirrorBySourceId = useMemo(() => {
    const mapping = new Map<string, string>()
    for (const task of sortedTasks) {
      if (!task.sourceTaskId || task.completed) {
        continue
      }
      mapping.set(task.sourceTaskId, task.id)
    }
    return mapping
  }, [sortedTasks])

  const ungroupedTaskIds = useMemo(
    () =>
      sortedTasks
        .filter((task) => !task.groupId && !(hideCompleted && task.completed))
        .map((task) => task.id),
    [sortedTasks, hideCompleted],
  )

  const groupTaskIds = useMemo(() => {
    const mapping = new Map<string, string[]>()
    for (const group of groups) {
      mapping.set(group.id, [])
    }

    for (const task of sortedTasks) {
      if (task.groupId && mapping.has(task.groupId)) {
        if (hideCompleted && task.completed) {
          continue
        }
        mapping.get(task.groupId)?.push(task.id)
      }
    }

    return mapping
  }, [groups, sortedTasks, hideCompleted])

  const groupProgress = useMemo(() => {
    const progress = new Map<string, { done: number; total: number }>()
    for (const group of groups) {
      progress.set(group.id, { done: 0, total: 0 })
    }

    for (const task of sortedTasks) {
      if (!task.groupId) {
        continue
      }

      const current = progress.get(task.groupId)
      if (!current) {
        continue
      }

      current.total += 1
      if (task.completed) {
        current.done += 1
      }
    }

    return progress
  }, [groups, sortedTasks])

  return {
    sortedTasks,
    taskMap,
    groupNameMap,
    floatingTasks,
    backlogSourceTaskIds,
    backlogMirrorBySourceId,
    ungroupedTaskIds,
    groupTaskIds,
    groupProgress,
  }
}
