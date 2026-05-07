import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import type { Task } from '../types'
import { TaskItem } from './TaskItem'
import { UnifiedComposer } from './UnifiedComposer'

type TaskColumnProps = {
  id: string
  title: string
  collapsed?: boolean
  taskIds: string[]
  taskMap: Map<string, Task>
  completingTaskIds: Set<string>
  onToggle: (taskId: string) => void
  onUpdate: (taskId: string, value: string) => void
  onDelete: (taskId: string) => void
  onCreateTask: (value: string, groupId?: string) => void
  onCreateTasksFromPaste: (value: string, groupId?: string) => void
  onCreateGroupCommand: (value: string) => void
}

export function TaskColumn({
  id,
  title,
  collapsed,
  taskIds,
  taskMap,
  completingTaskIds,
  onToggle,
  onUpdate,
  onDelete,
  onCreateTask,
  onCreateTasksFromPaste,
  onCreateGroupCommand,
}: TaskColumnProps) {
  const { setNodeRef } = useDroppable({ id: `container-${id}` })
  const remainingCount = taskIds.length

  return (
    <section ref={setNodeRef} className="task-column" data-container-id={`container-${id}`}>
      {title ? (
        <header className="task-column-title">
          {title}
          <span>{remainingCount}</span>
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

                return (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isCompleting={completingTaskIds.has(task.id)}
                    onToggle={onToggle}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                  />
                )
              })}
            </div>
          </SortableContext>

          <div className="task-column-composer">
            <UnifiedComposer
              groupId={id === 'ungrouped' ? undefined : id}
              placeholder={id === 'ungrouped' ? 'Add task, or /g Group Name' : `Add task to ${title || 'group'}...`}
              onCreateTask={onCreateTask}
              onCreateTasksFromPaste={onCreateTasksFromPaste}
              onCreateGroup={onCreateGroupCommand}
            />
          </div>
        </div>
      )}
    </section>
  )
}
