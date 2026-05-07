import type { Task } from '../types'
import { Button } from './ui/Button'
import { Card } from './ui/Card'

type FloatingModePanelProps = {
  tasks: Task[]
  groupNames: Map<string, string>
  onToggleTask: (taskId: string) => void
  onSwitchToFull: () => void
}

export function FloatingModePanel({ tasks, groupNames, onToggleTask, onSwitchToFull }: FloatingModePanelProps) {
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
        <div className="floating-player-header">
          <p className="floating-kicker">TaskQueue</p>
          <Button type="button" variant="ghost" size="sm" onClick={onSwitchToFull}>
            List
          </Button>
        </div>

        <p className="floating-label">Focus</p>
        {currentTask ? (
          <div className="floating-main-task">
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
              <div key={task.id} className="floating-queue-item">
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
