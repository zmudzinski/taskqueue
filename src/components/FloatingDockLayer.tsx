import type { Task } from '../types'
import { FloatingModePanel } from './FloatingModePanel'

type FloatingDockLayerProps = {
  edgeDockSide: 'left' | 'right'
  edgeDockEnabled: boolean
  edgeDockHidden: boolean
  floatingTasks: Task[]
  floatingProgress: { completed: number; total: number }
  groupNameMap: Map<string, string>
  taskMap: Map<string, Task>
  completingTaskIds: Set<string>
  visibleNextCount: number
  floatingQueueExpanded: boolean
  onFloatingMouseEnter: () => void
  onFloatingMouseLeave: () => void
  onToggleTask: (taskId: string) => void
  onPromoteTask: (taskId: string) => void
  onSwitchToFull: () => void
  onToggleQueueExpanded: () => void
  onStartDrag: () => void
  onSnap: () => void
  onDockCorner: (corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => void
}

export function FloatingDockLayer({
  edgeDockSide,
  edgeDockEnabled,
  edgeDockHidden,
  floatingTasks,
  floatingProgress,
  groupNameMap,
  taskMap,
  completingTaskIds,
  visibleNextCount,
  floatingQueueExpanded,
  onFloatingMouseEnter,
  onFloatingMouseLeave,
  onToggleTask,
  onPromoteTask,
  onSwitchToFull,
  onToggleQueueExpanded,
  onStartDrag,
  onSnap,
  onDockCorner,
}: FloatingDockLayerProps) {
  return (
    <div
      className={`floating-edge-dock-layer edge-dock-${edgeDockSide} ${edgeDockHidden ? 'is-hidden' : 'is-visible'}`}
      onMouseEnter={onFloatingMouseEnter}
      onMouseLeave={onFloatingMouseLeave}
    >
      {edgeDockEnabled && edgeDockHidden ? (
        <button
          type="button"
          className={`floating-edge-handle edge-handle-${edgeDockSide === 'left' ? 'right' : 'left'}`}
          aria-label="Reveal TaskQueue"
          title="Reveal TaskQueue"
          onMouseEnter={onFloatingMouseEnter}
          onFocus={onFloatingMouseEnter}
        >
          TASKQUEUE
        </button>
      ) : null}

      <FloatingModePanel
        tasks={floatingTasks}
        totalTasks={floatingProgress.total}
        completedTasks={floatingProgress.completed}
        groupNames={groupNameMap}
        taskMap={taskMap}
        completingTaskIds={completingTaskIds}
        onToggleTask={onToggleTask}
        onPromoteTask={onPromoteTask}
        visibleNextCount={visibleNextCount}
        isQueueExpanded={floatingQueueExpanded}
        onSwitchToFull={onSwitchToFull}
        onToggleQueueExpanded={onToggleQueueExpanded}
        onStartDrag={onStartDrag}
        onSnap={onSnap}
        onDockCorner={onDockCorner}
      />
    </div>
  )
}
