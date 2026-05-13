import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '../types'

type TaskItemProps = {
  task: Task
  isCompleting?: boolean
  sourceGroupName?: string
  backlogActionMode?: 'add' | 'remove'
  dropIndicator?: 'before' | 'after'
  onToggle: (taskId: string) => void
  onUpdate: (taskId: string, value: string) => void
  onDelete: (taskId: string) => void
  onBacklogAction?: () => void
}

export function TaskItem({
  task,
  isCompleting,
  sourceGroupName,
  backlogActionMode,
  dropIndicator,
  onToggle,
  onUpdate,
  onDelete,
  onBacklogAction,
}: TaskItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.content)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.id}`,
  })

  // We use DragOverlay for the visual drag preview and a blue-line indicator
  // for drop position. Suppress transforms on all items so the list doesn't
  // shift around creating a competing "slot" placeholder.
  const style = {
    transform: isDragging ? CSS.Transform.toString(transform) : undefined,
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0 : 1,
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`task-item ${task.completed ? 'is-done' : ''} ${isCompleting ? 'is-completing' : ''} ${dropIndicator ? `drop-indicator-${dropIndicator}` : ''}`}
    >
      <button className="task-handle" type="button" {...attributes} {...listeners} aria-label="Drag task">
        <span className="drag-dots" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
      </button>

      <button
        className={`task-check ${task.completed ? 'checked' : ''}`}
        type="button"
        onClick={() => onToggle(task.id)}
        aria-label={task.completed ? 'Undo task' : 'Mark task done'}
      >
        {task.completed ? '✓' : ''}
      </button>

      <div className="task-body">
        {sourceGroupName ? <span className="task-origin-badge">{sourceGroupName}</span> : null}
        {editing ? (
          <input
            autoFocus
            className="task-edit-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => {
              onUpdate(task.id, draft)
              setEditing(false)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onUpdate(task.id, draft)
                setEditing(false)
              }

              if (event.key === 'Escape') {
                setDraft(task.content)
                setEditing(false)
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="task-content"
            onDoubleClick={() => {
              setDraft(task.content)
              setEditing(true)
            }}
          >
            {task.content}
          </button>
        )}
      </div>

      <div className="task-actions">
        <button className="task-delete" type="button" onClick={() => onDelete(task.id)} aria-label="Delete task">
          ×
        </button>

        {backlogActionMode && onBacklogAction ? (
          <button
            className={`task-action task-backlog-btn ${backlogActionMode === 'remove' ? 'is-remove' : 'is-add'}`}
            type="button"
            aria-label={backlogActionMode === 'remove' ? 'Remove from sprint' : 'Add to sprint'}
            data-tooltip={backlogActionMode === 'remove' ? 'Remove from sprint' : 'Add to sprint'}
            onClick={onBacklogAction}
          >
            {backlogActionMode === 'remove' ? '↓' : '↑'}
          </button>
        ) : null}
      </div>

    </article>
  )
}
