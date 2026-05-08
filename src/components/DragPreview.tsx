import type { Task } from '../types'

type DragPreviewProps = {
  task?: Task
}

export function DragPreview({ task }: DragPreviewProps) {
  if (!task) {
    return null
  }

  return (
    <article className={`task-item drag-preview ${task.completed ? 'is-done' : ''}`}>
      <button className="task-handle" type="button" tabIndex={-1} aria-hidden="true">
        <span className="drag-dots" aria-hidden="true">
          <span /><span /><span /><span /><span /><span />
        </span>
      </button>
      <button className={`task-check ${task.completed ? 'checked' : ''}`} type="button" tabIndex={-1} aria-hidden="true">
        {task.completed ? '✓' : ''}
      </button>
      <div className="task-body">
        <p className="task-content drag-preview-content">{task.content}</p>
      </div>
    </article>
  )
}
