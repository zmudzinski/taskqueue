import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '../types'

type TaskItemProps = {
  task: Task
  isCompleting?: boolean
  onToggle: (taskId: string) => void
  onUpdate: (taskId: string, value: string) => void
  onDelete: (taskId: string) => void
}

export function TaskItem({ task, isCompleting, onToggle, onUpdate, onDelete }: TaskItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.content)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.id}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.48 : 1,
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`task-item ${task.completed ? 'is-done' : ''} ${isCompleting ? 'is-completing' : ''}`}
    >
      <button className="task-handle" type="button" {...attributes} {...listeners} aria-label="Drag task">
        ⋮
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

      <button className="task-delete" type="button" onClick={() => onDelete(task.id)} aria-label="Delete task">
        ×
      </button>
    </article>
  )
}
