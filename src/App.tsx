import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { loadState, saveState } from './lib/persistence'
import {
  applyStickyMode,
  applyWindowSize,
  snapWindowToCorner,
  toggleWindowVisibility,
} from './lib/window-manager'
import { useTaskQueueStore } from './store/useTaskQueueStore'
import type { Group, Task } from './types'
import './App.css'

type SortableTaskProps = {
  task: Task
  groups: Group[]
  onToggle: (taskId: string) => void
  onUpdate: (taskId: string, value: string) => void
  onDelete: (taskId: string) => void
  onGroupChange: (taskId: string, groupId?: string) => void
}

function SortableTaskCard({
  task,
  groups,
  onToggle,
  onUpdate,
  onDelete,
  onGroupChange,
}: SortableTaskProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.content)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `task-${task.id}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  }

  return (
    <article ref={setNodeRef} style={style} className="task-card">
      <button
        className={`checkbox ${task.completed ? 'checked' : ''}`}
        type="button"
        onClick={() => onToggle(task.id)}
        aria-label={task.completed ? 'Undo task' : 'Mark as done'}
      />

      <div className="task-main" {...attributes} {...listeners}>
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

      <select
        className="group-select"
        value={task.groupId ?? ''}
        onChange={(event) => onGroupChange(task.id, event.target.value || undefined)}
      >
        <option value="">Inbox</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
      </select>

      <button className="task-delete" type="button" onClick={() => onDelete(task.id)}>
        x
      </button>
    </article>
  )
}

function StaticTaskPreview({ task }: { task: Task }) {
  return (
    <article className="task-card dragging-preview">
      <button className="checkbox" type="button" aria-label="Task" />
      <div className="task-main">
        <div className="task-content">{task.content}</div>
      </div>
    </article>
  )
}

type ContainerProps = {
  id: string
  title: string
  collapsed?: boolean
  taskIds: string[]
  taskMap: Map<string, Task>
  groups: Group[]
  onToggle: (taskId: string) => void
  onUpdate: (taskId: string, value: string) => void
  onDelete: (taskId: string) => void
  onGroupChange: (taskId: string, groupId?: string) => void
}

function TaskContainer({
  id,
  title,
  collapsed,
  taskIds,
  taskMap,
  groups,
  onToggle,
  onUpdate,
  onDelete,
  onGroupChange,
}: ContainerProps) {
  const { setNodeRef } = useDroppable({
    id: `container-${id}`,
  })

  return (
    <section ref={setNodeRef} className="queue-group" data-container-id={`container-${id}`}>
      <header className="queue-group-title">{title}</header>

      {!collapsed && (
        <SortableContext
          id={`container-${id}`}
          items={taskIds.map((taskId) => `task-${taskId}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="task-list">
            {taskIds.map((taskId) => {
              const task = taskMap.get(taskId)
              if (!task) {
                return null
              }

              return (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  groups={groups}
                  onToggle={onToggle}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onGroupChange={onGroupChange}
                />
              )
            })}
          </div>
        </SortableContext>
      )}
    </section>
  )
}

function App() {
  const {
    tasks,
    groups,
    settings,
    inputValue,
    groupDraft,
    loaded,
    setLoaded,
    hydrate,
    setInputValue,
    setGroupDraft,
    addTask,
    addTasksFromPaste,
    toggleTask,
    updateTask,
    removeTask,
    createGroup,
    renameGroup,
    toggleGroupCollapsed,
    reorderTask,
    setTaskGroup,
    setOpacity,
    setWindowHeight,
    setWindowWidth,
    setStickyMode,
    toggleCompletedCollapsed,
    toggleMode,
    getPersistedState,
  } = useTaskQueueStore()

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null)
  const [groupRenameDraft, setGroupRenameDraft] = useState('')
  const autoSaveTimer = useRef<number | null>(null)

  const sensors = useSensors(useSensor(MouseSensor))

  const sortedTasks = useMemo(() => [...tasks].sort((a, b) => a.order - b.order), [tasks])
  const activeTasks = useMemo(() => sortedTasks.filter((task) => !task.completed), [sortedTasks])
  const completedTasks = useMemo(() => sortedTasks.filter((task) => task.completed), [sortedTasks])

  const taskMap = useMemo(() => new Map(sortedTasks.map((task) => [task.id, task])), [sortedTasks])

  const ungroupedTaskIds = useMemo(
    () => activeTasks.filter((task) => !task.groupId).map((task) => task.id),
    [activeTasks],
  )

  const groupTaskIds = useMemo(() => {
    const mapping = new Map<string, string[]>()
    for (const group of groups) {
      mapping.set(group.id, [])
    }

    for (const task of activeTasks) {
      if (task.groupId && mapping.has(task.groupId)) {
        const list = mapping.get(task.groupId)
        if (list) {
          list.push(task.id)
        }
      }
    }

    return mapping
  }, [activeTasks, groups])

  const currentTask = activeTasks[0]
  const nextTasks = activeTasks.slice(1, 4)

  useEffect(() => {
    document.documentElement.style.setProperty('--app-opacity', String(settings.opacity))
  }, [settings.opacity])

  useEffect(() => {
    let mounted = true

    async function bootstrap(): Promise<void> {
      try {
        const snapshot = await loadState()
        if (snapshot && mounted) {
          hydrate(snapshot)
        }
      } catch (error) {
        console.error('Could not load persisted state', error)
      } finally {
        if (mounted) {
          setLoaded(true)
        }
      }
    }

    bootstrap().catch((error) => {
      console.error(error)
      setLoaded(true)
    })

    return () => {
      mounted = false
    }
  }, [hydrate, setLoaded])

  useEffect(() => {
    if (!loaded) {
      return
    }

    if (autoSaveTimer.current) {
      window.clearTimeout(autoSaveTimer.current)
    }

    autoSaveTimer.current = window.setTimeout(() => {
      saveState(getPersistedState()).catch((error) => {
        console.error('Autosave failed', error)
      })
    }, 280)

    return () => {
      if (autoSaveTimer.current) {
        window.clearTimeout(autoSaveTimer.current)
      }
    }
  }, [getPersistedState, loaded, tasks, groups, settings])

  useEffect(() => {
    applyWindowSize(settings.windowWidth, settings.windowHeight).catch((error) => {
      console.error('Could not set size', error)
    })
  }, [settings.windowHeight, settings.windowWidth])

  useEffect(() => {
    applyStickyMode(settings.stickyMode).catch((error) => {
      console.error('Could not set always on top', error)
    })
  }, [settings.stickyMode])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      if (!mod) {
        return
      }

      const key = event.key.toLowerCase()

      if (key === 's' && event.shiftKey) {
        event.preventDefault()
        toggleWindowVisibility().catch((error) => {
          console.error('Could not toggle window visibility', error)
        })
      }

      if (key === 's' && !event.shiftKey) {
        event.preventDefault()
        saveState(getPersistedState()).catch((error) => {
          console.error('Manual save failed', error)
        })
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [getPersistedState])

  const onDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id)
    if (id.startsWith('task-')) {
      setActiveTaskId(id.replace('task-', ''))
    }
  }

  const onDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null

    setActiveTaskId(null)

    if (!overId || !activeId.startsWith('task-')) {
      return
    }

    const taskId = activeId.replace('task-', '')

    if (overId.startsWith('task-')) {
      const targetTaskId = overId.replace('task-', '')
      const targetTask = taskMap.get(targetTaskId)
      if (!targetTask || targetTask.completed) {
        return
      }
      reorderTask(taskId, targetTask.groupId ?? 'ungrouped', targetTaskId)
      return
    }

    if (overId.startsWith('container-')) {
      reorderTask(taskId, overId.replace('container-', ''))
    }
  }

  const onQuickInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      addTask(inputValue)
    }
  }

  const onQuickInputPaste = (event: ReactClipboardEvent<HTMLInputElement>) => {
    const payload = event.clipboardData.getData('text')
    if (!payload.includes('\n')) {
      return
    }

    event.preventDefault()
    addTasksFromPaste(payload)
  }

  if (!loaded) {
    return <main className="app-shell loading">Loading queue...</main>
  }

  return (
    <main className={`app-shell ${settings.mode}`}>
      <header className="topbar" data-tauri-drag-region onMouseUp={() => snapWindowToCorner()}>
        <div className="topbar-title">
          <strong>TaskQueue</strong>
          <span>Current + next, always in view</span>
        </div>

        <div className="topbar-actions" data-tauri-drag-region="false">
          <button type="button" onClick={() => toggleMode()}>
            {settings.mode === 'floating' ? 'Full mode' : 'Floating'}
          </button>
        </div>
      </header>

      <section className="quick-input-row">
        <input
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={onQuickInputKeyDown}
          onPaste={onQuickInputPaste}
          placeholder="Paste lines or type and press Enter"
        />
        <button type="button" onClick={() => addTask(inputValue)}>
          Add
        </button>
      </section>

      {settings.mode === 'floating' ? (
        <section className="floating-shell">
          <div className="current-card">
            <p className="label">Current task</p>
            {currentTask ? (
              <>
                <h2>{currentTask.content}</h2>
                <button type="button" onClick={() => toggleTask(currentTask.id)}>
                  Mark done
                </button>
              </>
            ) : (
              <h2>Queue is clear. Drop your next focus item.</h2>
            )}
          </div>

          {nextTasks.length > 0 && (
            <div className="next-stack">
              <p className="label">Next</p>
              {nextTasks.map((task) => (
                <button key={task.id} type="button" className="next-task" onClick={() => toggleTask(task.id)}>
                  {task.content}
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <section className="full-mode-layout">
            <div className="queue-column">
              <TaskContainer
                id="ungrouped"
                title="Inbox"
                taskIds={ungroupedTaskIds}
                taskMap={taskMap}
                groups={groups}
                onToggle={toggleTask}
                onUpdate={updateTask}
                onDelete={removeTask}
                onGroupChange={setTaskGroup}
              />

              {groups.map((group) => (
                <section className="group-shell" key={group.id}>
                  <header className="group-head">
                    <button type="button" onClick={() => toggleGroupCollapsed(group.id)}>
                      {group.collapsed ? '+' : '-'}
                    </button>

                    {renamingGroupId === group.id ? (
                      <input
                        autoFocus
                        value={groupRenameDraft}
                        onChange={(event) => setGroupRenameDraft(event.target.value)}
                        onBlur={() => {
                          renameGroup(group.id, groupRenameDraft)
                          setRenamingGroupId(null)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            renameGroup(group.id, groupRenameDraft)
                            setRenamingGroupId(null)
                          }
                          if (event.key === 'Escape') {
                            setRenamingGroupId(null)
                          }
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="group-title"
                        onDoubleClick={() => {
                          setRenamingGroupId(group.id)
                          setGroupRenameDraft(group.name)
                        }}
                      >
                        {group.name}
                      </button>
                    )}
                  </header>

                  <TaskContainer
                    id={group.id}
                    title=""
                    collapsed={group.collapsed}
                    taskIds={groupTaskIds.get(group.id) ?? []}
                    taskMap={taskMap}
                    groups={groups}
                    onToggle={toggleTask}
                    onUpdate={updateTask}
                    onDelete={removeTask}
                    onGroupChange={setTaskGroup}
                  />
                </section>
              ))}

              <section className="group-create">
                <input
                  value={groupDraft}
                  onChange={(event) => setGroupDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      createGroup()
                    }
                  }}
                  placeholder="Create group"
                />
                <button type="button" onClick={() => createGroup()}>
                  Add group
                </button>
              </section>

              <section className="completed-shell">
                <button type="button" className="completed-toggle" onClick={toggleCompletedCollapsed}>
                  Completed ({completedTasks.length}) {settings.completedCollapsed ? '+' : '-'}
                </button>

                {!settings.completedCollapsed && (
                  <div className="completed-list">
                    {completedTasks.map((task) => (
                      <article key={task.id} className="completed-item">
                        <button type="button" className="checkbox checked" onClick={() => toggleTask(task.id)} />
                        <span>{task.content}</span>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside className="settings-column">
              <h3>Settings</h3>

              <label>
                Opacity {Math.round(settings.opacity * 100)}%
                <input
                  type="range"
                  min={70}
                  max={100}
                  value={Math.round(settings.opacity * 100)}
                  onChange={(event) => setOpacity(Number(event.target.value) / 100)}
                />
              </label>

              <label>
                Width {settings.windowWidth}px
                <input
                  type="range"
                  min={360}
                  max={900}
                  value={settings.windowWidth}
                  onChange={(event) => setWindowWidth(Number(event.target.value))}
                />
              </label>

              <label>
                Height {settings.windowHeight}px
                <input
                  type="range"
                  min={300}
                  max={980}
                  value={settings.windowHeight}
                  onChange={(event) => setWindowHeight(Number(event.target.value))}
                />
              </label>

              <label className="switch-row">
                <input
                  type="checkbox"
                  checked={settings.stickyMode}
                  onChange={(event) => setStickyMode(event.target.checked)}
                />
                Sticky mode (always on top)
              </label>

              <div className="hint-list">
                <p>Shortcuts:</p>
                <p>Enter to add task</p>
                <p>Cmd/Ctrl+S to save now</p>
                <p>Cmd/Ctrl+Shift+S to hide/show window</p>
                <p>Paste multi-line text to create one task per line</p>
              </div>
            </aside>
          </section>

          <DragOverlay>
            {activeTaskId ? <StaticTaskPreview task={taskMap.get(activeTaskId)!} /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </main>
  )
}

export default App
