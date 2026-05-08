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
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { loadState } from './lib/persistence'
import {
  applyWindowSize,
  dockWindowToEdge,
  dockWindowToCorner,
  focusWindow,
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

// These constants MUST match the CSS values in App.css
const FLOATING_HEADER_H = 44         // .titlebar height
const FLOATING_CURRENT_ROW_H = 44    // .floating-main-task height (border-bottom included)
const FLOATING_QUEUE_CHROME_H = 0    // no extra chrome — border is inside current row
const FLOATING_QUEUE_ROW_H = 34      // .floating-queue-item height

function getCollapsedFloatingHeight(visibleNextCount: number): number {
  const rows = Math.max(2, Math.round(visibleNextCount))
  return FLOATING_HEADER_H + FLOATING_CURRENT_ROW_H + FLOATING_QUEUE_CHROME_H + rows * FLOATING_QUEUE_ROW_H
}

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
    setFloatingWindowSize,
    setStickyMode,
    setEdgeDockEnabled,
    setEdgeDockSide,
    setHideCompleted,
    setSoundsEnabled,
    setThemeMode,
    setFloatingVisibleNextCount,
    purgeCompleted,
    deleteAllTasks,
    undoLastAction,
    getPersistedState,
  } = useTaskQueueStore()

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [overTaskId, setOverTaskId] = useState<string | null>(null)
  const [overPosition, setOverPosition] = useState<'before' | 'after'>('after')
  const [settingsOpen, setSettingsOpen] = useState(false)
    const overTaskIdRef = useRef<string | null>(null)
    const overPositionRef = useRef<'before' | 'after'>('after')
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [floatingPromotedTaskId, setFloatingPromotedTaskId] = useState<string | null>(null)
  const [floatingQueueExpanded, setFloatingQueueExpanded] = useState(false)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)

  const settingsMenuRef = useRef<HTMLElement | null>(null)
  const queueScrollRef = useRef<HTMLDivElement | null>(null)
  const edgeDockHideTimerRef = useRef<number | null>(null)

  const { updateVersion, isChecking, upToDate, checkForUpdates, handleInstallUpdate } = useUpdater()

  const { confirmRequest, setConfirmRequest, requestDeleteTask, requestDeleteGroup, requestPurgeCompleted, requestDeleteAll } =
    useConfirmDialog()

  const { closeApp } = useCloseRequest({ setConfirmRequest })

  const {
    sortedTasks,
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

  const { onAddToBacklogWithSound, onRemoveFromBacklogWithSound } = useBacklogActions({
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
    floatingWindowHeight: settings.floatingWindowHeight,
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
    document.documentElement.dataset.floatingContrast = settings.opacity <= 0.45 ? 'light' : 'normal'
  }, [settings.opacity])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = () => {
      const resolved = settings.themeMode === 'system'
        ? (media.matches ? 'dark' : 'light')
        : settings.themeMode
      document.documentElement.dataset.theme = resolved
    }

    applyTheme()
    media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [settings.themeMode])

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

  useWindowSync({ loaded, settings, setWindowSize, setFloatingWindowSize })
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
    setOverTaskId(null)
    if (id.startsWith('task-')) {
      setActiveTaskId(id.replace('task-', ''))
      setActiveGroupId(null)
      return
    }

    if (id.startsWith('group-')) {
      setActiveGroupId(id.replace('group-', ''))
      setActiveTaskId(null)
    }
  }

  const onDragOver = (event: DragOverEvent) => {
    const overId = event.over ? String(event.over.id) : null
    if (!overId?.startsWith('task-')) {
      setOverTaskId(null)
      return
    }
    const targetTaskId = overId.replace('task-', '')
    const translatedRect = event.active.rect.current.translated
    const overRect = event.over?.rect
    if (translatedRect && overRect) {
      const activeCenterY = translatedRect.top + translatedRect.height / 2
      const pos = activeCenterY < overRect.top + overRect.height / 2 ? 'before' : 'after'
      setOverPosition(pos)
      overPositionRef.current = pos
    }
    setOverTaskId(targetTaskId)
    overTaskIdRef.current = targetTaskId
  }

  const onDragEnd = (event: DragEndEvent) => {
      overTaskIdRef.current = null
    setOverTaskId(null)
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null
    setActiveTaskId(null)
    setActiveGroupId(null)

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

      if (targetGroupId !== groupId) {
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
      // Use the position tracked by onDragOver (same source as the blue-line indicator)
      const targetPosition = overTaskIdRef.current === targetTaskId
        ? overPositionRef.current
        : 'after'
      reorderTask(taskId, targetContainer, targetTaskId, targetPosition)
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

  const prevFloatingQueueExpandedRef = useRef(false)

  const clearEdgeDockHideTimer = () => {
    if (edgeDockHideTimerRef.current) {
      window.clearTimeout(edgeDockHideTimerRef.current)
      edgeDockHideTimerRef.current = null
    }
  }

  const [edgeDockHidden, setEdgeDockHidden] = useState(false)
  const edgeDockHiddenRef = useRef(false)
  const previousEdgeDockEnabledRef = useRef(false)

  useEffect(() => {
    edgeDockHiddenRef.current = edgeDockHidden
  }, [edgeDockHidden])

  useEffect(() => {
    if (settings.mode !== 'floating') {
      if (floatingQueueExpanded) {
        setFloatingQueueExpanded(false)
      }
      prevFloatingQueueExpandedRef.current = false
      return
    }

    const collapsedHeight = getCollapsedFloatingHeight(settings.floatingVisibleNextCount)
    setFloatingQueueExpanded(settings.floatingWindowHeight > collapsedHeight + 20)
  }, [settings.mode, settings.floatingWindowHeight, settings.floatingVisibleNextCount, floatingQueueExpanded])

  useEffect(() => {
    const wasExpanded = prevFloatingQueueExpandedRef.current
    prevFloatingQueueExpandedRef.current = floatingQueueExpanded

    if (!loaded || settings.mode !== 'floating' || floatingQueueExpanded) {
      return
    }

    // Only snap to collapsed height when:
    // 1. Queue was just collapsed (expanded → collapsed transition), or
    // 2. The visible row count changed (need to recalculate height)
    const collapsedHeight = getCollapsedFloatingHeight(settings.floatingVisibleNextCount)
    const justCollapsed = wasExpanded && !floatingQueueExpanded
    const alreadyAtCollapsedHeight = Math.abs(settings.floatingWindowHeight - collapsedHeight) <= 1

    if (!justCollapsed && alreadyAtCollapsedHeight) {
      return
    }

    if (!justCollapsed && !wasExpanded) {
      // User is manually resizing while collapsed — don't fight them
      return
    }

    setFloatingWindowSize(settings.floatingWindowWidth, collapsedHeight)
    applyWindowSize(settings.floatingWindowWidth, collapsedHeight).catch((error) => {
      console.error('Could not align collapsed floating height', error)
    })
  }, [
    loaded,
    settings.mode,
    settings.floatingWindowWidth,
    settings.floatingVisibleNextCount,
    settings.floatingWindowHeight,
    floatingQueueExpanded,
    setFloatingWindowSize,
  ])

  useEffect(() => {
    return () => {
      clearEdgeDockHideTimer()
    }
  }, [])

  useEffect(() => {
    if (!loaded) {
      return
    }

    const canUseEdgeDock = settings.mode === 'floating' && settings.edgeDockEnabled
    const wasEdgeDockEnabled = previousEdgeDockEnabledRef.current
    previousEdgeDockEnabledRef.current = canUseEdgeDock

    if (!canUseEdgeDock) {
      clearEdgeDockHideTimer()
      if (edgeDockHiddenRef.current) {
        dockWindowToEdge(settings.edgeDockSide, false, { animate: true, durationMs: 220 }).catch((error) => {
          console.error('Could not reveal docked window', error)
        })
        setEdgeDockHidden(false)
      }
      return
    }

    if (!wasEdgeDockEnabled) {
      dockWindowToEdge(settings.edgeDockSide, true, { animate: true, durationMs: 220 }).catch((error) => {
        console.error('Could not hide docked window', error)
      })
      setEdgeDockHidden(true)
      return
    }

    dockWindowToEdge(settings.edgeDockSide, edgeDockHiddenRef.current, { animate: true, durationMs: 220 }).catch((error) => {
      console.error('Could not update edge dock position', error)
    })
  }, [loaded, settings.mode, settings.edgeDockEnabled, settings.edgeDockSide])

  const onFloatingMouseEnter = () => {
    clearEdgeDockHideTimer()
    if (settings.mode !== 'floating' || !settings.edgeDockEnabled || !edgeDockHidden) {
      return
    }

    dockWindowToEdge(settings.edgeDockSide, false, { animate: true, durationMs: 220 }).catch((error) => {
      console.error('Could not reveal edge-docked window', error)
    })
    focusWindow().catch((error) => {
      console.error('Could not focus edge-docked window', error)
    })
    edgeDockHiddenRef.current = false
    setEdgeDockHidden(false)
  }

  const onFloatingMouseLeave = () => {
    if (settings.mode !== 'floating' || !settings.edgeDockEnabled || edgeDockHidden) {
      return
    }

    clearEdgeDockHideTimer()
    edgeDockHideTimerRef.current = window.setTimeout(() => {
      dockWindowToEdge(settings.edgeDockSide, true, { animate: true, durationMs: 220 }).catch((error) => {
        console.error('Could not hide edge-docked window', error)
      })
      edgeDockHiddenRef.current = true
      setEdgeDockHidden(true)
      edgeDockHideTimerRef.current = null
    }, 220)
  }

  const activeGroup = useMemo(
    () => (activeGroupId ? groups.find((group) => group.id === activeGroupId) ?? null : null),
    [activeGroupId, groups],
  )

  const floatingProgress = useMemo(() => {
    const backlogTasks = sortedTasks.filter((task) => !task.groupId)
    let completed = 0
    for (const task of backlogTasks) {
      if (task.completed) {
        completed += 1
      }
    }

    return {
      completed,
      total: backlogTasks.length,
    }
  }, [sortedTasks])

  const onToggleFloatingQueueExpanded = () => {
    const nextExpanded = !floatingQueueExpanded
    const collapsedHeight = getCollapsedFloatingHeight(settings.floatingVisibleNextCount)
    const minExtraRows = 3
    const desiredRows = Math.max(minExtraRows, Math.max(0, floatingTasks.length - settings.floatingVisibleNextCount))
    const expandedHeight = Math.min(560, collapsedHeight + desiredRows * FLOATING_QUEUE_ROW_H)
    const nextHeight = nextExpanded ? expandedHeight : collapsedHeight

    setFloatingQueueExpanded(nextExpanded)
    setFloatingWindowSize(settings.windowWidth, nextHeight)
    applyWindowSize(settings.windowWidth, nextHeight).catch((error) => {
      console.error('Floating height update failed', error)
    })
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
              setConfirmRequest({
                title: 'Close app',
                message: 'Are you sure you want to close TaskQueue?',
                confirmLabel: 'Close',
                destructive: true,
                onConfirm: closeApp,
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
            edgeDockEnabled={settings.edgeDockEnabled}
            edgeDockSide={settings.edgeDockSide}
            hideCompleted={settings.hideCompleted}
            soundsEnabled={settings.soundsEnabled}
            themeMode={settings.themeMode}
            floatingVisibleNextCount={settings.floatingVisibleNextCount}
            onOpacityChange={setOpacity}
            onStickyChange={setStickyMode}
            onEdgeDockEnabledChange={setEdgeDockEnabled}
            onEdgeDockSideChange={setEdgeDockSide}
            onHideCompletedChange={setHideCompleted}
            onSoundsEnabledChange={setSoundsEnabled}
            onThemeModeChange={setThemeMode}
            onFloatingVisibleNextCountChange={setFloatingVisibleNextCount}
            onDeleteCompleted={() => requestPurgeCompleted(purgeCompleted)}
            onDeleteAll={() => requestDeleteAll(deleteAllTasks)}
            updateVersion={updateVersion}
            isChecking={isChecking}
            upToDate={upToDate}
            onCheckForUpdates={checkForUpdates}
            onInstallUpdate={handleInstallUpdate}
          />
        </>
      ) : null}

      {settings.mode === 'floating' ? (
        <div
          className={`floating-edge-dock-layer edge-dock-${settings.edgeDockSide} ${edgeDockHidden ? 'is-hidden' : 'is-visible'}`}
          onMouseEnter={onFloatingMouseEnter}
          onMouseLeave={onFloatingMouseLeave}
        >
          {settings.edgeDockEnabled && edgeDockHidden ? (
            <button
              type="button"
              className={`floating-edge-handle edge-handle-${settings.edgeDockSide === 'left' ? 'right' : 'left'}`}
              aria-label="Reveal TaskQueue"
              title="Reveal TaskQueue"
              onMouseEnter={onFloatingMouseEnter}
              onFocus={onFloatingMouseEnter}
            >
              TASKQUEUE
            </button>
          ) : null}
          <FloatingModePanel
            tasks={floatingTasks}
            totalTasks={floatingProgress.total}
            completedTasks={floatingProgress.completed}
            groupNames={groupNameMap}
            taskMap={taskMap}
            completingTaskIds={completingTaskIds}
            onToggleTask={onToggleTaskAnimated}
            onPromoteTask={setFloatingPromotedTaskId}
            visibleNextCount={settings.floatingVisibleNextCount}
            isQueueExpanded={floatingQueueExpanded}
            onSwitchToFull={() => setMode('full')}
            onToggleQueueExpanded={onToggleFloatingQueueExpanded}
            onStartDrag={() => {
              startWindowDragging().catch((error) => {
                console.error('Floating drag start failed', error)
              })
            }}
            onSnap={() => {
              snapWindowToCorner().catch((error) => {
                console.error('Floating snap failed', error)
              })
            }}
            onDockCorner={(corner) => {
              dockWindowToCorner(corner).catch((error) => {
                console.error('Dock failed', error)
              })
            }}
          />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
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
                overTaskId={overTaskId}
                overPosition={overPosition}
                onToggle={onToggleTaskAnimated}
                onUpdate={updateTask}
                onDelete={(taskId) => requestDeleteTask(taskId, removeTask)}
                onAddToBacklog={onAddToBacklogWithSound}
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
                    overTaskId={overTaskId}
                    overPosition={overPosition}
                    onToggleTask={onToggleTaskAnimated}
                    onUpdateTask={updateTask}
                    onDeleteTask={(taskId) => requestDeleteTask(taskId, removeTask)}
                    onAddToBacklog={onAddToBacklogWithSound}
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
            {!activeTaskId && activeGroup ? (
              <div className="group-drag-preview">
                <span className="group-drag-preview-name">{activeGroup.name}</span>
                <span className="group-drag-preview-count">{groupTaskIds.get(activeGroup.id)?.length ?? 0}</span>
              </div>
            ) : null}
          </DragOverlay>
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
