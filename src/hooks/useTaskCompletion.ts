import { useEffect, useRef, useState } from 'react'
import { playTaskCompletedSound, playTaskUncompletedSound } from '../lib/sounds'

type UseTaskCompletionParams = {
  soundsEnabled: boolean
  taskMap: Map<string, { id: string; completed: boolean }>
  toggleTask: (taskId: string) => void
  onPromotedTaskCompleted: (taskId: string) => void
}

type UseTaskCompletionResult = {
  completingTaskIds: Set<string>
  onToggleTaskAnimated: (taskId: string) => void
}

export function useTaskCompletion({
  soundsEnabled,
  taskMap,
  toggleTask,
  onPromotedTaskCompleted,
}: UseTaskCompletionParams): UseTaskCompletionResult {
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(new Set())
  const completionTimersRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    const timers = completionTimersRef.current
    return () => {
      for (const timer of timers.values()) {
        window.clearTimeout(timer)
      }
      timers.clear()
    }
  }, [])

  const onToggleTaskAnimated = (taskId: string) => {
    const task = taskMap.get(taskId)
    if (!task) {
      return
    }

    if (task.completed) {
      toggleTask(taskId)
      if (soundsEnabled) playTaskUncompletedSound()
      return
    }

    setCompletingTaskIds((current) => {
      const next = new Set(current)
      next.add(taskId)
      return next
    })

    const timerId = window.setTimeout(() => {
      toggleTask(taskId)
      if (soundsEnabled) playTaskCompletedSound()
      onPromotedTaskCompleted(taskId)
      setCompletingTaskIds((current) => {
        const next = new Set(current)
        next.delete(taskId)
        return next
      })
      completionTimersRef.current.delete(taskId)
    }, 220)

    completionTimersRef.current.set(taskId, timerId)
  }

  return { completingTaskIds, onToggleTaskAnimated }
}
