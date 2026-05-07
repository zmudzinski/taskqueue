import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Group, Task } from '../types'
import { TaskColumn } from './TaskColumn'
import { Button } from './ui/Button'

type SortableGroupSectionProps = {
  group: Group
  taskIds: string[]
  taskMap: Map<string, Task>
  groupNameMap: Map<string, string>
  backlogMirrorBySourceId: Map<string, string>
  doneCount: number
  totalCount: number
  completingTaskIds: Set<string>
  onToggleTask: (taskId: string) => void
  onUpdateTask: (taskId: string, value: string) => void
  onDeleteTask: (taskId: string) => void
  onAddToBacklog: (taskId: string) => void
  onRemoveFromBacklog: (taskId: string) => void
  onToggleGroupCollapsed: (groupId: string) => void
  onRenameGroup: (groupId: string, name: string) => void
  onDeleteGroup: (groupId: string) => void
  onCreateTaskInGroup: (value: string, groupId?: string) => void
  onCreateTasksFromPaste: (value: string, groupId?: string) => void
}

export function SortableGroupSection({
  group,
  taskIds,
  taskMap,
  groupNameMap,
  backlogMirrorBySourceId,
  doneCount,
  totalCount,
  completingTaskIds,
  onToggleTask,
  onUpdateTask,
  onDeleteTask,
  onAddToBacklog,
  onRemoveFromBacklog,
  onToggleGroupCollapsed,
  onRenameGroup,
  onDeleteGroup,
  onCreateTaskInGroup,
  onCreateTasksFromPaste,
}: SortableGroupSectionProps) {
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState(group.name)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `group-${group.id}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  }

  return (
    <section ref={setNodeRef} style={style} className="group-block" data-group-id={group.id}>
      <header
        className="group-header"
      >
        <Button type="button" variant="ghost" size="icon" onClick={() => onToggleGroupCollapsed(group.id)}>
          {group.collapsed ? '▸' : '▾'}
        </Button>

        {renaming ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={() => {
              onRenameGroup(group.id, nameDraft)
              setRenaming(false)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onRenameGroup(group.id, nameDraft)
                setRenaming(false)
              }

              if (event.key === 'Escape') {
                setRenaming(false)
                setNameDraft(group.name)
              }
            }}
          />
        ) : (
          <div className="group-name-row">
            <button
              type="button"
              className="group-name"
              onDoubleClick={() => {
                setNameDraft(group.name)
                setRenaming(true)
              }}
            >
              {group.name}
            </button>
            {group.collapsed ? <span className="group-progress-badge">{doneCount}/{totalCount}</span> : null}
          </div>
        )}

        <div className="group-header-actions">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Delete group"
            onClick={() => onDeleteGroup(group.id)}
          >
            <Trash2 size={14} />
          </Button>
          <Button
            type="button"
            className="group-drag-handle"
            variant="ghost"
            size="icon"
            aria-label="Move group"
            {...attributes}
            {...listeners}
          >
            <span className="drag-dots" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </span>
          </Button>
        </div>
      </header>

      <TaskColumn
        id={group.id}
        title=""
        collapsed={group.collapsed}
        taskIds={taskIds}
        taskMap={taskMap}
        groupNameMap={groupNameMap}
        backlogMirrorBySourceId={backlogMirrorBySourceId}
        completingTaskIds={completingTaskIds}
        onToggle={onToggleTask}
        onUpdate={onUpdateTask}
        onDelete={onDeleteTask}
        onAddToBacklog={onAddToBacklog}
        onRemoveFromBacklog={onRemoveFromBacklog}
        onCreateTask={onCreateTaskInGroup}
        onCreateTasksFromPaste={onCreateTasksFromPaste}
      />
    </section>
  )
}
