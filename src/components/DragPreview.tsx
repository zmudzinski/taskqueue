import type { Task } from '../types'

type DragPreviewProps = {
  task?: Task
}

export function DragPreview({ task }: DragPreviewProps) {
  if (!task) {
    return null
  }

  return (
    <article className="task-item drag-preview">
      <div className="task-check" />
      <div className="task-body">{task.content}</div>
    </article>
  )
}
