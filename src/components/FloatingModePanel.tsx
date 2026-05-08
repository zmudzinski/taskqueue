import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Task } from '../types'
import type { WindowCorner } from '../lib/window-manager'
import { ArrowDownLeft, ArrowDownRight, ArrowUpLeft, ArrowUpRight, ChevronDown, ChevronUp, Pause, PictureInPicture2, Play } from 'lucide-react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'

type FloatingModePanelProps = {
  tasks: Task[]
  totalTasks: number
  completedTasks: number
  groupNames: Map<string, string>
  taskMap: Map<string, Task>
  completingTaskIds: Set<string>
  onToggleTask: (taskId: string) => void
  onPromoteTask: (taskId: string) => void
  visibleNextCount: number
  isQueueExpanded: boolean
  onSwitchToFull: () => void
  onToggleQueueExpanded: () => void
  onStartDrag: () => void
  onSnap: () => void
  onDockCorner: (corner: WindowCorner) => void
}

export function FloatingModePanel({
  tasks,
  totalTasks,
  completedTasks,
  groupNames,
  taskMap,
  completingTaskIds,
  onToggleTask,
  onPromoteTask,
  visibleNextCount,
  isQueueExpanded,
  onSwitchToFull,
  onToggleQueueExpanded,
  onStartDrag,
  onSnap,
  onDockCorner,
}: FloatingModePanelProps) {
  const currentTask = tasks[0]
  const upcoming = tasks.slice(1)
  const normalizedTotal = Math.max(0, totalTasks)
  const normalizedCompleted = Math.min(Math.max(0, completedTasks), normalizedTotal)
  const completionRatio = normalizedTotal > 0 ? normalizedCompleted / normalizedTotal : 0
  const ringRadius = 9
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference * (1 - completionRatio)
  const visibleRows = Math.max(2, visibleNextCount)
  const queueStyle = isQueueExpanded
    ? undefined
    : ({
        ['--floating-next-max-height' as const]: `${visibleRows * 34}px`,
      } as CSSProperties)
  const [dockMenuOpen, setDockMenuOpen] = useState(false)
  const dockMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!dockMenuOpen) {
      return
    }

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (target && dockMenuRef.current?.contains(target)) {
        return
      }
      setDockMenuOpen(false)
    }

    window.addEventListener('mousedown', onClickOutside)
    return () => window.removeEventListener('mousedown', onClickOutside)
  }, [dockMenuOpen])

  const getGroupLabel = (task: Task): string => {
    if (task.groupId) {
      return groupNames.get(task.groupId) ?? 'Group'
    }
    if (task.sourceTaskId) {
      const sourceGroupId = taskMap.get(task.sourceTaskId)?.groupId
      if (sourceGroupId) {
        return groupNames.get(sourceGroupId) ?? 'Group'
      }
    }
    return 'Unassigned'
  }

  return (
    <section className="floating-mode">
      <Card className="floating-player">
        <div
          className="titlebar floating-player-header"
          onMouseDown={(event) => {
            const target = event.target as HTMLElement
            if (target.closest('button')) {
              return
            }
            event.preventDefault()
            onStartDrag()
          }}
        >
          <div className="titlebar-left">
            <strong>TASKQUEUE</strong>
          </div>

          <div className="titlebar-drag-space" />

          <div className="titlebar-right floating-header-actions" data-no-drag="true">
            <div
              className="floating-progress-pill"
              role="img"
              aria-label={`Completed ${normalizedCompleted} of ${normalizedTotal} tasks`}
              title={`${normalizedCompleted}/${normalizedTotal} completed`}
            >
              <svg className="floating-progress-ring" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="floating-progress-track" cx="12" cy="12" r={ringRadius} />
                <circle
                  className="floating-progress-value"
                  cx="12"
                  cy="12"
                  r={ringRadius}
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                />
              </svg>
              <span className="floating-progress-count">
                {normalizedCompleted}/{normalizedTotal}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="titlebar-icon-btn"
              onClick={onToggleQueueExpanded}
              aria-label={isQueueExpanded ? 'Collapse next list' : 'Expand next list'}
            >
              {isQueueExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </Button>
            <Button
              type="button"
              variant="default"
              size="icon"
              className="titlebar-icon-btn titlebar-mode-btn"
              onClick={onSwitchToFull}
              aria-label="Switch to list view"
            >
              <Pause size={13} />
            </Button>
            <div className="floating-dock-wrap" ref={dockMenuRef}>
              <Button type="button" variant="ghost" size="icon" className="titlebar-icon-btn" onClick={() => setDockMenuOpen((open) => !open)} aria-label="Dock options">
                <PictureInPicture2 size={13} />
              </Button>
              {dockMenuOpen ? (
                <div className="floating-dock-menu" role="menu" aria-label="Dock position">
                  <button type="button" aria-label="Top left" onClick={() => { onDockCorner('top-left'); setDockMenuOpen(false) }}>
                    <ArrowUpLeft size={14} />
                  </button>
                  <button type="button" aria-label="Top right" onClick={() => { onDockCorner('top-right'); setDockMenuOpen(false) }}>
                    <ArrowUpRight size={14} />
                  </button>
                  <button type="button" aria-label="Bottom left" onClick={() => { onDockCorner('bottom-left'); setDockMenuOpen(false) }}>
                    <ArrowDownLeft size={14} />
                  </button>
                  <button type="button" aria-label="Bottom right" onClick={() => { onDockCorner('bottom-right'); setDockMenuOpen(false) }}>
                    <ArrowDownRight size={14} />
                  </button>
                  <button type="button" className="floating-dock-nearest" onClick={() => { onSnap(); setDockMenuOpen(false) }}>Nearest</button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {currentTask ? (
          <div className={`floating-main-task ${completingTaskIds.has(currentTask.id) ? 'is-completing' : ''}`}>
            <button
              type="button"
              className="task-check floating-check"
              onClick={() => onToggleTask(currentTask.id)}
              aria-label="Mark current task done"
            />
            <div className="floating-main-task-body">
              <p className="floating-main-task-line">
                <span className="floating-current-title">{currentTask.content}</span>
                <span className="task-origin-badge floating-inline-badge">{getGroupLabel(currentTask)}</span>
              </p>
            </div>
          </div>
        ) : (
          <p className="floating-empty">All done</p>
        )}

        {/* <p className="floating-next-label">Next</p> */}
        <div className={`floating-queue-items ${isQueueExpanded ? 'is-expanded' : ''}`} style={queueStyle}>
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
                  <span className="floating-task-text">{task.content}</span>
                  <button
                    type="button"
                    className="floating-promote-btn"
                    aria-label="Focus this task"
                    onClick={() => onPromoteTask(task.id)}
                  >
                    <Play size={11} fill="currentColor" />
                  </button>
                </div>
                <span className="task-origin-badge floating-inline-badge">{getGroupLabel(task)}</span>
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
