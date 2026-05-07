import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  closestCorners,
  KeyboardSensor,
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { loadState } from './lib/persistence'
import {
  closeWindow,
  minimizeWindow,
  snapWindowToCorner,
  startWindowDragging,
} from './lib/window-manager'
import { useAutosave } from './hooks/useAutosave'
import { useBacklogActions } from './hooks/useBacklogActions'
import { useCloseRequest } from './hooks/useCloseRequest'
import { useConfirmDialog } from './hooks/useConfirmDialog'
import { useDerivedTaskData } from './hooks/useDerivedTaskData'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { useModeTransition } from './hooks/useModeTransition'
import { useTaskCompletion } from './hooks/useTaskCompletion'
import { useUpdater } from './hooks/useUpdater'
import { useWindowSync } from './hooks/useWindowSync'
import { useTaskQueueStore } from './store/useTaskQueueStore'
import { DragPreview } from './components/DragPreview'
import { FloatingModePanel } from './components/FloatingModePanel'
import { AddGroupComposer } from './components/AddGroupComposer'
import { SettingsMenu } from './components/SettingsMenu'
import { SortableGroupSection } from './components/SortableGroupSection'
import { TaskColumn } from './components/TaskColumn'
import { TitleBar } from './components/TitleBar'
import { ConfirmDialog } from './components/ui/ConfirmDialog'
import './App.css'

function App() {
  const appVersion = __APP_VERSION__

  const {
    tasks,
    groups,
    settings,
    loaded,
    setLoaded,
    hydrate,
    addTask,
    addTasksFromPaste,
    addTaskToBacklog,
    toggleTask,
    updateTask,
    removeTask,
    createGroup,
    removeGroup,
    renameGroup,
    toggleGroupCollapsed,
    reorderGroup,
    reorderTask,
    setMode,
    toggleMode,
    setOpacity,
    setWindowSize,
    setStickyMode,
    setHideCompleted,
    setSoundsEnabled,
    purgeCompleted,
    undoLastAction,
    getPersistedState,
  } = useTaskQueueStore()

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [floatingPromotedTaskId, setFloatingPromotedTaskId] = useState<string | null>(null)

  const settingsMenuRef = useRef<HTMLElement | null>(null)
  const queueScrollRef = useRef<HTMLDivElement | null>(null)

  const { updateVersion, dismissUpdate, handleInstallUpdate } = useUpdater()

  const { confirmRequest, setConfirmRequest, requestDeleteTask, requestDeleteGroup, requestPurgeCompleted } =
    useConfirmDialog()

  useCloseRequest({ setConfirmRequest })

  const {
    taskMap,
    groupNameMap,
    floatingTasks,
    backlogSourceTaskIds,
    backlogMirrorBySourceId,
    ungroupedTaskIds,
    groupTaskIds,
    groupProgress,
  } = useDerivedTaskData({
    tasks,
    groups,
    hideCompleted: settings.hideCompleted,
    promotedTaskId: floatingPromotedTaskId,
  })

  const { completingTaskIds, onToggleTaskAnimated } = useTaskCompletion({
    soundsEnabled: settings.soundsEnabled,
    taskMap,
    toggleTask,
    onPromotedTaskCompleted: (taskId) => {
      setFloatingPromotedTaskId((current) => (current === taskId ? null : current))
    },
  })

  const { backlogToast, onAddToBacklogWithToast, onRemoveFromBacklogWithSound } = useBacklogActions({
    soundsEnabled: settings.soundsEnabled,
    backlogSourceTaskIds,
    scrollContainerRef: queueScrollRef,
    addTaskToBacklog,
    removeTask,
    tasks,
  })

  useModeTransition({
    loaded,
    mode: settings.mode,
    windowWidth: settings.windowWidth,
    windowHeight: settings.windowHeight,
  })

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
    document.documentElement.style.setProperty('--surface-alpha', String(settings.opacity))
  }, [settings.opacity])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!settingsOpen) {
        return
      }

      const target = event.target as Element | null
      if (target?.closest('[data-settings-trigger]')) {
        return
      }

      if (target && settingsMenuRef.current?.contains(target as Node)) {
        return
      }

      setSettingsOpen(false)
    }

    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [settingsOpen])

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) {
      return pointerCollisions
    }
    return closestCorners(args)
  }

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

    if (!overId) {
      return
    }

    if (activeId.startsWith('group-')) {
      const groupId = activeId.replace('group-', '')
      let targetGroupId: string | undefined

      if (overId.startsWith('group-')) {
        targetGroupId = overId.replace('group-', '')
      } else if (overId.startsWith('container-')) {
        const candidate = overId.replace('container-', '')
        targetGroupId = candidate === 'ungrouped' ? undefined : candidate
      } else if (overId.startsWith('task-')) {
        const targetTaskId = overId.replace('task-', '')
        targetGroupId = taskMap.get(targetTaskId)?.groupId
      }

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
      if (!targetTask) {
        return
      }
      const targetContainer = targetTask.groupId ?? 'ungrouped'
      const sourceTask = taskMap.get(taskId)
      if (sourceTask?.groupId && !targetTask.groupId) {
        return
      }
      reorderTask(taskId, targetContainer, targetTaskId)
      return
    }

    if (overId.startsWith('container-')) {
      const targetContainer = overId.replace('container-', '')
      const sourceTask = taskMap.get(taskId)
      if (sourceTask?.groupId && targetContainer === 'ungrouped') {
        return
      }
      reorderTask(taskId, targetContainer)
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

  const onTopBarKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && settingsOpen) {
      setSettingsOpen(false)
    }
  }

  if (!loaded) {
    return (
      <main className="app-shell loading" aria-busy="true" aria-live="polite">
        <div className="loading-indicator" />
        <p>Loading TaskQueue...</p>
      </main>
    )
  }

  return (
    <main className={`app-shell ${settings.mode}`} onKeyDown={onTopBarKeyDown}>
      {updateVersion && (
        <div className="update-banner">
          <span>v{updateVersion} available</span>
          <button className="update-banner-install" onClick={handleInstallUpdate}>
            Install &amp; Restart
          </button>
          <button className="update-banner-dismiss" onClick={dismissUpdate}>
            Later
          </button>
        </div>
      )}

      {settings.mode === 'full' ? (
        <>
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
            onMinimize={() => {
              minimizeWindow().catch((error) => {
                console.error('Could not minimize window', error)
              })
            }}
            onClose={() => {
              closeWindow().catch((error) => {
                console.error('Could not close window', error)
              })
            }}
            onSnap={() => {
              snapWindowToCorner().catch((error) => {
                console.error('Snap failed', error)
              })
            }}
          />

          <SettingsMenu
            isOpen={settingsOpen}
            menuRef={settingsMenuRef}
            appVersion={appVersion}
            opacity={settings.opacity}
            stickyMode={settings.stickyMode}
            hideCompleted={settings.hideCompleted}
            soundsEnabled={settings.soundsEnabled}
            onOpacityChange={setOpacity}
            onStickyChange={setStickyMode}
            onHideCompletedChange={setHideCompleted}
            onSoundsEnabledChange={setSoundsEnabled}
            onDeleteCompleted={() => requestPurgeCompleted(purgeCompleted)}
          />
        </>
      ) : null}

      {settings.mode === 'floating' ? (
        <FloatingModePanel
          tasks={floatingTasks}
          groupNames={groupNameMap}
          completingTaskIds={completingTaskIds}
          onToggleTask={onToggleTaskAnimated}
          onPromoteTask={setFloatingPromotedTaskId}
          onSwitchToFull={() => setMode('full')}
          onStartDrag={() => {
            startWindowDragging().catch((error) => {
              console.error('Floating drag start failed', error)
            })
          }}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <section className="full-layout">
            <div ref={queueScrollRef} className="queue-scroll">
              <TaskColumn
                id="ungrouped"
                title="Backlog"
                taskIds={ungroupedTaskIds}
                taskMap={taskMap}
                groupNameMap={groupNameMap}
                backlogMirrorBySourceId={backlogMirrorBySourceId}
                completingTaskIds={completingTaskIds}
                onToggle={onToggleTaskAnimated}
                onUpdate={updateTask}
                onDelete={(taskId) => requestDeleteTask(taskId, removeTask)}
                onAddToBacklog={onAddToBacklogWithToast}
                onRemoveFromBacklog={onRemoveFromBacklogWithSound}
              />

              <SortableContext
                id="group-order"
                items={groups.map((group) => `group-${group.id}`)}
                strategy={verticalListSortingStrategy}
              >
                {groups.map((group) => (
                  <SortableGroupSection
                    key={group.id}
                    group={group}
                    taskIds={groupTaskIds.get(group.id) ?? []}
                    taskMap={taskMap}
                    groupNameMap={groupNameMap}
                    backlogMirrorBySourceId={backlogMirrorBySourceId}
                    doneCount={groupProgress.get(group.id)?.done ?? 0}
                    totalCount={groupProgress.get(group.id)?.total ?? 0}
                    completingTaskIds={completingTaskIds}
                    onToggleTask={onToggleTaskAnimated}
                    onUpdateTask={updateTask}
                    onDeleteTask={(taskId) => requestDeleteTask(taskId, removeTask)}
                    onAddToBacklog={onAddToBacklogWithToast}
                    onRemoveFromBacklog={onRemoveFromBacklogWithSound}
                    onToggleGroupCollapsed={toggleGroupCollapsed}
                    onRenameGroup={renameGroup}
                    onDeleteGroup={(groupId) =>
                      requestDeleteGroup(groupId, groupNameMap.get(groupId) ?? 'this group', removeGroup)
                    }
                    onCreateTaskInGroup={addTask}
                    onCreateTasksFromPaste={addTasksFromPaste}
                  />
                ))}
              </SortableContext>

              <section className="task-column add-group-block">
                <header className="task-column-title">Groups</header>
                <div className="task-column-shell">
                  <AddGroupComposer onCreateGroup={createGroup} />
                </div>
              </section>
            </div>
          </section>

          <DragOverlay>
            {activeTaskId ? <DragPreview task={taskMap.get(activeTaskId)} /> : null}
          </DragOverlay>

          {backlogToast ? (
            <div className="backlog-toast" role="status" aria-live="polite">
              Added to Backlog ↑
            </div>
          ) : null}
        </DndContext>
      )}

      <ConfirmDialog
        open={Boolean(confirmRequest)}
        title={confirmRequest?.title ?? ''}
        message={confirmRequest?.message ?? ''}
        confirmLabel={confirmRequest?.confirmLabel}
        cancelLabel={confirmRequest?.cancelLabel}
        destructive={confirmRequest?.destructive}
        onCancel={() => setConfirmRequest(null)}
        onConfirm={() => {
          const action = confirmRequest?.onConfirm
          setConfirmRequest(null)
          action?.()
        }}
      />
    </main>
  )
}

export default App
