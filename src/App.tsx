import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  KeyboardSensor,
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { loadState } from './lib/persistence'
import {
  applyWindowSize,
  closeWindow,
  minimizeWindow,
  snapWindowToCorner,
  startWindowDragging,
} from './lib/window-manager'
import { useAutosave } from './hooks/useAutosave'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { useWindowSync } from './hooks/useWindowSync'
import { useTaskQueueStore } from './store/useTaskQueueStore'
import { FloatingModePanel } from './components/FloatingModePanel'
import { SettingsMenu } from './components/SettingsMenu'
import { SortableGroupSection } from './components/SortableGroupSection'
import { TaskColumn } from './components/TaskColumn'
import { TitleBar } from './components/TitleBar'
import type { Task } from './types'
import './App.css'

function DragPreview({ task }: { task?: Task }) {
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

function App() {
  const {
    tasks,
    groups,
    settings,
    loaded,
    setLoaded,
    hydrate,
    addTask,
    addTasksFromPaste,
    toggleTask,
    updateTask,
    removeTask,
    createGroup,
    renameGroup,
    toggleGroupCollapsed,
    reorderGroup,
    reorderTask,
    setMode,
    toggleMode,
    setOpacity,
    setWindowSize,
    setStickyMode,
    toggleCompletedCollapsed,
    undoLastAction,
    getPersistedState,
  } = useTaskQueueStore()

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(new Set())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const settingsMenuRef = useRef<HTMLElement | null>(null)
  const completionTimersRef = useRef<Map<string, number>>(new Map())
  const lastModeRef = useRef(settings.mode)
  const fullModeSizeRef = useRef<{ width: number; height: number } | null>(null)

  // Listen for update-available events emitted by the Rust updater (release builds only)
  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return
    let unlisten: (() => void) | undefined
    import('@tauri-apps/api/event')
      .then(({ listen }) =>
        listen<string>('update-available', (event) => setUpdateVersion(event.payload)),
      )
      .then((fn) => {
        unlisten = fn
      })
    return () => {
      unlisten?.()
    }
  }, [])

  const handleInstallUpdate = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('install_update')
    } catch (error) {
      console.error('Update install failed', error)
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const sortedTasks = useMemo(() => [...tasks].sort((a, b) => a.order - b.order), [tasks])
  const activeTasks = useMemo(() => sortedTasks.filter((task) => !task.completed), [sortedTasks])
  const completedTasks = useMemo(() => sortedTasks.filter((task) => task.completed), [sortedTasks])
  const taskMap = useMemo(() => new Map(sortedTasks.map((task) => [task.id, task])), [sortedTasks])
  const groupNameMap = useMemo(() => new Map(groups.map((group) => [group.id, group.name])), [groups])
  const floatingTasks = useMemo(() => activeTasks, [activeTasks])

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
        mapping.get(task.groupId)?.push(task.id)
      }
    }

    return mapping
  }, [activeTasks, groups])

  useEffect(() => {
    document.documentElement.style.setProperty('--surface-alpha', String(settings.opacity))
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

  useAutosave({
    loaded,
    trackedTasks: tasks,
    trackedGroups: groups,
    trackedSettings: settings,
    getPersistedState,
    onSaved: setLastSavedAt,
  })

  useWindowSync({ loaded, settings, setWindowSize })
  useGlobalShortcuts({ getPersistedState, undoLastAction })

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!settingsOpen) {
        return
      }

      const target = event.target as Node | null
      if (target && settingsMenuRef.current?.contains(target)) {
        return
      }

      setSettingsOpen(false)
    }

    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [settingsOpen])

  const onDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id)
    if (id.startsWith('task-')) {
      setActiveTaskId(id.replace('task-', ''))
      return
    }
  }

  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length) {
      return pointerCollisions
    }

    const rectCollisions = rectIntersection(args)
    if (rectCollisions.length) {
      return rectCollisions
    }

    return closestCorners(args)
  }

  const onDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null
    setActiveTaskId(null)

    if (!overId) {
      return
    }

    if (activeId.startsWith('group-')) {
      const groupId = activeId.replace('group-', '')
      const targetGroupId = overId.startsWith('group-') ? overId.replace('group-', '') : undefined
      if (targetGroupId && targetGroupId !== groupId) {
        reorderGroup(groupId, targetGroupId)
      }
      return
    }

    if (!activeId.startsWith('task-')) {
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

  const onComposerCreateTask = (value: string, groupId?: string) => {
    addTask(value, groupId)
  }

  const onComposerCreateGroup = (value: string) => {
    createGroup(value)
  }

  const onComposerPaste = (value: string, groupId?: string) => {
    addTasksFromPaste(value, groupId)
  }

  const onToggleTaskAnimated = (taskId: string) => {
    const task = taskMap.get(taskId)
    if (!task) {
      return
    }

    if (task.completed) {
      toggleTask(taskId)
      return
    }

    setCompletingTaskIds((current) => {
      const next = new Set(current)
      next.add(taskId)
      return next
    })

    const timerId = window.setTimeout(() => {
      toggleTask(taskId)
      setCompletingTaskIds((current) => {
        const next = new Set(current)
        next.delete(taskId)
        return next
      })
      completionTimersRef.current.delete(taskId)
    }, 220)

    completionTimersRef.current.set(taskId, timerId)
  }

  const onMinimize = () => {
    minimizeWindow().catch((error) => {
      console.error('Could not minimize window', error)
    })
  }

  const onClose = () => {
    if (!window.confirm('Czy na pewno chcesz zamknac aplikacje?')) {
      return
    }

    closeWindow().catch((error) => {
      console.error('Could not close window', error)
    })
  }

  const onTopBarKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && settingsOpen) {
      setSettingsOpen(false)
    }
  }

  const lastSavedLabel = useMemo(() => {
    if (!lastSavedAt) {
      return 'Autosave active'
    }

    return `Saved ${new Date(lastSavedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })}`
  }, [lastSavedAt])

  useEffect(() => {
    const timers = completionTimersRef.current
    return () => {
      for (const timer of timers.values()) {
        window.clearTimeout(timer)
      }
      timers.clear()
    }
  }, [])

  useEffect(() => {
    if (!loaded) {
      return
    }

    if (lastModeRef.current !== 'floating' && settings.mode === 'floating') {
      fullModeSizeRef.current = {
        width: settings.windowWidth,
        height: settings.windowHeight,
      }

      applyWindowSize(440, 320).catch((error) => {
        console.error('Could not resize floating mode', error)
      })
    }

    if (lastModeRef.current === 'floating' && settings.mode !== 'floating') {
      const previousFullSize = fullModeSizeRef.current
      if (previousFullSize) {
        applyWindowSize(previousFullSize.width, previousFullSize.height).catch((error) => {
          console.error('Could not restore full mode size', error)
        })
      }
    }

    lastModeRef.current = settings.mode
  }, [loaded, settings.mode, settings.windowHeight, settings.windowWidth])

  if (!loaded) {
    return <main className="app-shell loading">Loading queue...</main>
  }

  return (
    <main className={`app-shell ${settings.mode}`} onKeyDown={onTopBarKeyDown}>
      {updateVersion && (
        <div className="update-banner">
          <span>v{updateVersion} available</span>
          <button className="update-banner-install" onClick={handleInstallUpdate}>
            Install &amp; Restart
          </button>
          <button className="update-banner-dismiss" onClick={() => setUpdateVersion(null)}>
            Later
          </button>
        </div>
      )}
      <TitleBar
        mode={settings.mode}
        settingsOpen={settingsOpen}
        saveStatusLabel={lastSavedLabel}
        onStartDrag={() => {
          startWindowDragging().catch((error) => {
            console.error('Drag start failed', error)
          })
        }}
        onToggleMode={toggleMode}
        onToggleSettings={() => setSettingsOpen((value) => !value)}
        onMinimize={onMinimize}
        onClose={onClose}
        onSnap={() => {
          snapWindowToCorner().catch((error) => {
            console.error('Snap failed', error)
          })
        }}
      />

      <SettingsMenu
        isOpen={settingsOpen}
        menuRef={settingsMenuRef}
        opacity={settings.opacity}
        stickyMode={settings.stickyMode}
        onOpacityChange={setOpacity}
        onStickyChange={setStickyMode}
      />

      {settings.mode === 'floating' ? (
        <FloatingModePanel
          tasks={floatingTasks}
          groupNames={groupNameMap}
          onToggleTask={onToggleTaskAnimated}
          onSwitchToFull={() => setMode('full')}
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <section className="full-layout">
            <div className="queue-scroll">
              <TaskColumn
                id="ungrouped"
                title="Backlog"
                taskIds={ungroupedTaskIds}
                taskMap={taskMap}
                completingTaskIds={completingTaskIds}
                onToggle={onToggleTaskAnimated}
                onUpdate={updateTask}
                onDelete={removeTask}
                onCreateTask={onComposerCreateTask}
                onCreateTasksFromPaste={onComposerPaste}
                onCreateGroupCommand={onComposerCreateGroup}
              />

              <SortableContext id="group-order" items={groups.map((group) => `group-${group.id}`)} strategy={verticalListSortingStrategy}>
                {groups.map((group) => (
                  <SortableGroupSection
                    key={group.id}
                    group={group}
                    taskIds={groupTaskIds.get(group.id) ?? []}
                    taskMap={taskMap}
                    completingTaskIds={completingTaskIds}
                    onToggleTask={onToggleTaskAnimated}
                    onUpdateTask={updateTask}
                    onDeleteTask={removeTask}
                    onToggleGroupCollapsed={toggleGroupCollapsed}
                    onRenameGroup={renameGroup}
                    onCreateTaskInGroup={onComposerCreateTask}
                    onCreateTasksFromPaste={onComposerPaste}
                    onCreateGroupCommand={onComposerCreateGroup}
                  />
                ))}
              </SortableContext>

              <section className="completed-block">
                <button type="button" className="completed-toggle" onClick={toggleCompletedCollapsed}>
                  Completed ({completedTasks.length}) {settings.completedCollapsed ? '+' : '-'}
                </button>

                {!settings.completedCollapsed && (
                  <div className="completed-list">
                    {completedTasks.length ? (
                      completedTasks.map((task) => (
                        <article key={task.id} className="completed-item">
                          <button type="button" className="task-check checked" onClick={() => onToggleTaskAnimated(task.id)} />
                          <span>{task.content}</span>
                        </article>
                      ))
                    ) : (
                      <div className="task-empty">Nothing completed yet</div>
                    )}
                  </div>
                )}
              </section>
            </div>
          </section>

          <DragOverlay>
            {activeTaskId ? <DragPreview task={taskMap.get(activeTaskId)} /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </main>
  )
}

export default App
