import { useEffect, useRef } from 'react'
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
  onAddToBacklogWithSound: (taskId: string) => void
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
  const backlogScrollAnchorRef = useRef<{ scrollTop: number; scrollHeight: number } | null>(null)

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

  const onAddToBacklogWithSound = (taskId: string) => {
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
  }

  const onRemoveFromBacklogWithSound = (taskId: string) => {
    removeTask(taskId)
    if (soundsEnabled) playBacklogRemovedSound()
  }

  return { onAddToBacklogWithSound, onRemoveFromBacklogWithSound }
}
