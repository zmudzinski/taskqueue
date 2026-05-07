import { useEffect, useRef, useState } from 'react'
import { playBacklogAddedSound, playBacklogRemovedSound } from '../lib/sounds'

type UseBacklogActionsParams = {
  soundsEnabled: boolean
  backlogSourceTaskIds: Set<string>
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  addTaskToBacklog: (taskId: string) => void
  removeTask: (taskId: string) => void
  tasks: unknown
}

type UseBacklogActionsResult = {
  backlogToast: boolean
  onAddToBacklogWithToast: (taskId: string) => void
  onRemoveFromBacklogWithSound: (taskId: string) => void
}

export function useBacklogActions({
  soundsEnabled,
  backlogSourceTaskIds,
  scrollContainerRef,
  addTaskToBacklog,
  removeTask,
  tasks,
}: UseBacklogActionsParams): UseBacklogActionsResult {
  const [backlogToast, setBacklogToast] = useState(false)
  const backlogToastTimerRef = useRef<number | undefined>(undefined)
  const backlogScrollAnchorRef = useRef<{ scrollTop: number; scrollHeight: number } | null>(null)

  useEffect(() => {
    const toastTimer = backlogToastTimerRef
    return () => {
      window.clearTimeout(toastTimer.current)
    }
  }, [])

  useEffect(() => {
    const anchor = backlogScrollAnchorRef.current
    const scrollElement = scrollContainerRef.current
    if (!anchor || !scrollElement) {
      return
    }

    const delta = scrollElement.scrollHeight - anchor.scrollHeight
    scrollElement.scrollTop = anchor.scrollTop + Math.max(0, delta)
    backlogScrollAnchorRef.current = null
  }, [tasks, scrollContainerRef])

  const onAddToBacklogWithToast = (taskId: string) => {
    if (backlogSourceTaskIds.has(taskId)) {
      return
    }

    const scrollElement = scrollContainerRef.current
    if (scrollElement) {
      backlogScrollAnchorRef.current = {
        scrollTop: scrollElement.scrollTop,
        scrollHeight: scrollElement.scrollHeight,
      }
    }

    addTaskToBacklog(taskId)
    if (soundsEnabled) playBacklogAddedSound()
    window.clearTimeout(backlogToastTimerRef.current)
    setBacklogToast(true)
    backlogToastTimerRef.current = window.setTimeout(() => setBacklogToast(false), 2200)
  }

  const onRemoveFromBacklogWithSound = (taskId: string) => {
    removeTask(taskId)
    if (soundsEnabled) playBacklogRemovedSound()
  }

  return { backlogToast, onAddToBacklogWithToast, onRemoveFromBacklogWithSound }
}
