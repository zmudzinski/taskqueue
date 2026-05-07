import type { Task } from '../types'
import { Button } from './ui/Button'
import { Card } from './ui/Card'

type FloatingModePanelProps = {
  tasks: Task[]
  groupNames: Map<string, string>
  completingTaskIds: Set<string>
  onToggleTask: (taskId: string) => void
  onPromoteTask: (taskId: string) => void
  onSwitchToFull: () => void
  onStartDrag: () => void
}

export function FloatingModePanel({
  tasks,
  groupNames,
  completingTaskIds,
  onToggleTask,
  onPromoteTask,
  onSwitchToFull,
  onStartDrag,
}: FloatingModePanelProps) {
  const currentTask = tasks[0]
  const upcoming = tasks.slice(1, 3)

  const getGroupLabel = (task: Task): string => {
    if (!task.groupId) {
      return 'Unassigned'
    }
    return groupNames.get(task.groupId) ?? 'Group'
  }

  return (
    <section className="floating-mode">
      <Card className="floating-player">
        <div
          className="floating-player-header"
          onMouseDown={(event) => {
            const target = event.target as HTMLElement
            if (target.closest('button')) {
              return
            }
            event.preventDefault()
            onStartDrag()
          }}
        >
          <p className="floating-kicker">Focus</p>
          <Button type="button" variant="ghost" size="sm" onClick={onSwitchToFull}>
            ← Back to list
          </Button>
        </div>

        <p className="floating-label">Focus</p>
        {currentTask ? (
          <div className={`floating-main-task ${completingTaskIds.has(currentTask.id) ? 'is-completing' : ''}`}>
            <button
              type="button"
              className="task-check floating-check"
              onClick={() => onToggleTask(currentTask.id)}
              aria-label="Mark current task done"
            />
            <div className="floating-main-task-body">
              <span className="floating-badge">{getGroupLabel(currentTask)}</span>
              <p>{currentTask.content}</p>
            </div>
          </div>
        ) : (
          <p className="floating-empty">All done</p>
        )}

        <div className="floating-queue-items">
          {upcoming.length ? (
            upcoming.map((task) => (
              <div key={task.id} className={`floating-queue-item ${completingTaskIds.has(task.id) ? 'is-completing' : ''}`}>
                <button
                  type="button"
                  className="task-check floating-check"
                  onClick={() => onToggleTask(task.id)}
                  aria-label="Mark next task done"
                />
                <div className="floating-queue-text">
                  <span className="floating-badge">{getGroupLabel(task)}</span>
                  <span>{task.content}</span>
                </div>
                <button
                  type="button"
                  className="floating-promote-btn"
                  aria-label="Focus this task"
                  onClick={() => onPromoteTask(task.id)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 12h10m0 0-4-4m4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            ))
          ) : (
            <p className="floating-empty">No next tasks</p>
          )}
        </div>
      </Card>
    </section>
  )
}
