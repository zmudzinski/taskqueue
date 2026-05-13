import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { Group, Task } from '../types'
import type { WindowCorner } from '../lib/window-manager'
import { ArrowDownLeft, ArrowDownRight, ArrowUpLeft, ArrowUpRight, ChevronDown, ChevronUp, Pause, PictureInPicture2, Play, Plus } from 'lucide-react'
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
  groups: Group[]
  onCreateTask: (value: string, groupId?: string) => void
  onCreateTasksFromPaste: (value: string, groupId?: string) => void
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
  groups,
  onCreateTask,
  onCreateTasksFromPaste,
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
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddValue, setQuickAddValue] = useState('')
  const [quickAddGroupQuery, setQuickAddGroupQuery] = useState('')
  const [quickAddGroupMenuOpen, setQuickAddGroupMenuOpen] = useState(false)
  const quickAddTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const quickAddGroupRef = useRef<HTMLDivElement | null>(null)

  const groupIdByName = useMemo(() => {
    const lookup = new Map<string, string>()
    for (const group of groups) {
      lookup.set(group.name.trim().toLowerCase(), group.id)
    }
    return lookup
  }, [groups])

  const selectedGroupId = useMemo(() => {
    const normalizedQuery = quickAddGroupQuery.trim().toLowerCase()
    if (!normalizedQuery) {
      return undefined
    }

    const exact = groupIdByName.get(normalizedQuery)
    if (exact) {
      return exact
    }

    const partial = groups.find((group) => group.name.toLowerCase().includes(normalizedQuery))
    return partial?.id
  }, [quickAddGroupQuery, groupIdByName, groups])

  const filteredGroups = useMemo(() => {
    const normalizedQuery = quickAddGroupQuery.trim().toLowerCase()
    const source = normalizedQuery
      ? groups.filter((group) => group.name.toLowerCase().includes(normalizedQuery))
      : groups

    return source.slice(0, 6)
  }, [groups, quickAddGroupQuery])

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

  useEffect(() => {
    if (!quickAddOpen) {
      return
    }

    setDockMenuOpen(false)

    const frameId = window.requestAnimationFrame(() => {
      quickAddTextareaRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [quickAddOpen])

  useEffect(() => {
    if (!quickAddGroupMenuOpen) {
      return
    }

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (target && quickAddGroupRef.current?.contains(target)) {
        return
      }
      setQuickAddGroupMenuOpen(false)
    }

    window.addEventListener('mousedown', onClickOutside)
    return () => window.removeEventListener('mousedown', onClickOutside)
  }, [quickAddGroupMenuOpen])

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

  const resolveGroupForToken = (rawToken: string): string | undefined => {
    const normalizedToken = rawToken.trim().toLowerCase()
    if (!normalizedToken) {
      return undefined
    }

    const exact = groupIdByName.get(normalizedToken)
    if (exact) {
      return exact
    }

    const partial = groups.find((group) => group.name.toLowerCase().includes(normalizedToken))
    return partial?.id
  }

  const submitQuickAdd = () => {
    const raw = quickAddValue.trim()
    if (!raw) {
      return
    }

    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    if (!lines.length) {
      return
    }

    const hasInlineGroup = lines.some((line) => line.includes('\t'))

    if (!hasInlineGroup) {
      if (lines.length === 1) {
        onCreateTask(lines[0], selectedGroupId)
      } else {
        onCreateTasksFromPaste(lines.join('\n'), selectedGroupId)
      }
    } else {
      for (const line of lines) {
        const tabIndex = line.indexOf('\t')
        if (tabIndex === -1) {
          onCreateTask(line, selectedGroupId)
          continue
        }

        const content = line.slice(0, tabIndex).trim()
        const inlineGroup = line.slice(tabIndex + 1).trim()
        if (!content) {
          continue
        }

        onCreateTask(content, resolveGroupForToken(inlineGroup) ?? selectedGroupId)
      }
    }

    setQuickAddValue('')
    setQuickAddGroupQuery('')
    setQuickAddGroupMenuOpen(false)
    setQuickAddOpen(false)
  }

  const onQuickAddKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setQuickAddOpen(false)
      return
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submitQuickAdd()
    }
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
            <Button
              type="button"
              variant="default"
              size="icon"
              className="titlebar-icon-btn floating-add-btn"
              onClick={() => setQuickAddOpen(true)}
              aria-label="Add task"
            >
              <Plus size={13} />
            </Button>
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

        {quickAddOpen ? (
          <div
            className="floating-quick-add-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setQuickAddOpen(false)
              }
            }}
          >
            <div
              className="floating-quick-add-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Quick add task"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <header>
                <h3>Quick Add</h3>
                <Button type="button" variant="ghost" size="icon" className="titlebar-icon-btn" aria-label="Close quick add" onClick={() => { setQuickAddOpen(false); setQuickAddGroupMenuOpen(false) }}>
                  ×
                </Button>
              </header>

              <div className="floating-quick-add-main">
                <textarea
                  ref={quickAddTextareaRef}
                  value={quickAddValue}
                  onChange={(event) => setQuickAddValue(event.target.value)}
                  onKeyDown={onQuickAddKeyDown}
                  placeholder="One task per line. Optional: task + TAB + group"
                />

                <div className="floating-quick-add-controls">
                  <div className="floating-quick-add-group" ref={quickAddGroupRef}>
                    <input
                      value={quickAddGroupQuery}
                      placeholder="Search group..."
                      onKeyDown={onQuickAddKeyDown}
                      onChange={(event) => {
                        setQuickAddGroupQuery(event.target.value)
                        setQuickAddGroupMenuOpen(true)
                      }}
                      onFocus={() => setQuickAddGroupMenuOpen(true)}
                    />

                      {quickAddGroupMenuOpen && filteredGroups.length ? (
                        <div className="floating-group-autocomplete" role="listbox" aria-label="Matching groups">
                          {filteredGroups.map((group) => (
                            <button
                              key={group.id}
                              type="button"
                              className={`floating-group-option ${selectedGroupId === group.id ? 'is-selected' : ''}`}
                              onMouseDown={(event) => {
                                event.preventDefault()
                                setQuickAddGroupQuery(group.name)
                                setQuickAddGroupMenuOpen(false)
                              }}
                            >
                              {group.name}
                            </button>
                          ))}
                        </div>
                      ) : null}
                  </div>

                  <Button type="button" className="floating-quick-add-submit" onClick={submitQuickAdd}>
                    Add
                  </Button>
                </div>
              </div>

              <p className="floating-quick-add-hint">Enter adds tasks, Shift+Enter adds a new line.</p>
            </div>
          </div>
        ) : null}
      </Card>
    </section>
  )
}
