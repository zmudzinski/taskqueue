import { useState } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { EllipsisVertical } from 'lucide-react'
import type { Task } from '../types'
import { TaskItem } from './TaskItem'
import { UnifiedComposer } from './UnifiedComposer'
import { Button } from './ui/Button'
import { DropdownMenu } from './ui/DropdownMenu'

type TaskColumnProps = {
  id: string
  title: string
  collapsed?: boolean
  taskIds: string[]
  taskMap: Map<string, Task>
  groupNameMap: Map<string, string>
  backlogMirrorBySourceId: Map<string, string>
  completingTaskIds: Set<string>
  overTaskId?: string | null
  overPosition?: 'before' | 'after'
  onToggle: (taskId: string) => void
  onUpdate: (taskId: string, value: string) => void
  onDelete: (taskId: string) => void
  onAddToBacklog: (taskId: string) => void
  onRemoveFromBacklog: (taskId: string) => void
  onClearBacklog?: () => void
  onClearCompletedBacklog?: () => void
  onClearOpenBacklog?: () => void
  onCreateTask?: (value: string, groupId?: string) => void
  onCreateTasksFromPaste?: (value: string, groupId?: string) => void
}

export function TaskColumn({
  id,
  title,
  collapsed,
  taskIds,
  taskMap,
  groupNameMap,
  backlogMirrorBySourceId,
  completingTaskIds,
  overTaskId,
  overPosition,
  onToggle,
  onUpdate,
  onDelete,
  onAddToBacklog,
  onRemoveFromBacklog,
  onClearBacklog,
  onClearCompletedBacklog,
  onClearOpenBacklog,
  onCreateTask,
  onCreateTasksFromPaste,
}: TaskColumnProps) {
  const [backlogMenuOpen, setBacklogMenuOpen] = useState(false)
  const { setNodeRef } = useDroppable({ id: `container-${id}` })
  const remainingCount = taskIds.length
  const isBacklogColumn = id === 'ungrouped'

  return (
    <section ref={setNodeRef} className="task-column" data-container-id={`container-${id}`}>
      {title ? (
        <header className="task-column-title">
          <span className="task-column-title-main">{title}</span>
          <span>{remainingCount}</span>
          {isBacklogColumn && onClearBacklog && onClearCompletedBacklog && onClearOpenBacklog ? (
            <DropdownMenu
              open={backlogMenuOpen}
              onOpenChange={setBacklogMenuOpen}
              contentClassName="backlog-actions-menu"
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="task-column-menu-trigger"
                  aria-label="Sprint options"
                  onClick={() => setBacklogMenuOpen((open) => !open)}
                >
                  <EllipsisVertical size={14} />
                </Button>
              }
            >
              <button type="button" onClick={() => { onClearCompletedBacklog(); setBacklogMenuOpen(false) }}>
                Clear completed
              </button>
              <button type="button" onClick={() => { onClearOpenBacklog(); setBacklogMenuOpen(false) }}>
                Clear open
              </button>
              <button type="button" onClick={() => { onClearBacklog(); setBacklogMenuOpen(false) }}>
                Clear sprint
              </button>
            </DropdownMenu>
          ) : null}
        </header>
      ) : null}

      {!collapsed && (
        <div className="task-column-shell">
          <SortableContext
            id={`container-${id}`}
            items={taskIds.map((taskId) => `task-${taskId}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="task-list">
              {!taskIds.length ? <div className="task-empty">No tasks here yet</div> : null}
              {taskIds.map((taskId) => {
                const task = taskMap.get(taskId)
                if (!task) {
                  return null
                }

                const mirroredTaskId = task.groupId ? backlogMirrorBySourceId.get(task.id) : undefined

                let backlogActionMode: 'add' | 'remove' | undefined
                let onBacklogAction: (() => void) | undefined

                if (!task.completed && task.groupId) {
                  if (mirroredTaskId) {
                    backlogActionMode = 'remove'
                    onBacklogAction = () => onRemoveFromBacklog(mirroredTaskId)
                  } else {
                    backlogActionMode = 'add'
                    onBacklogAction = () => onAddToBacklog(task.id)
                  }
                } else if (task.sourceTaskId && !task.groupId) {
                  backlogActionMode = 'remove'
                  onBacklogAction = () => onRemoveFromBacklog(task.id)
                }

                return (
                  <TaskItem
                    key={task.id}
                    task={task}
                    sourceGroupName={
                      task.sourceTaskId
                        ? groupNameMap.get(taskMap.get(task.sourceTaskId)?.groupId ?? '')
                        : undefined
                    }
                    backlogActionMode={backlogActionMode}
                    isCompleting={completingTaskIds.has(task.id)}
                    dropIndicator={overTaskId === task.id ? overPosition : undefined}
                    onToggle={onToggle}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    onBacklogAction={onBacklogAction}
                  />
                )
              })}
            </div>
          </SortableContext>

          {onCreateTask ? (
            <div className="task-column-composer">
              <UnifiedComposer
                groupId={id}
                placeholder={`Add task to ${title || 'group'}...`}
                onCreateTask={onCreateTask}
                onCreateTasksFromPaste={onCreateTasksFromPaste}
              />
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
