import {
  DndContext,
  DragOverlay,
  type CollisionDetection,
  type DndContextProps,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Group, Task } from '../types'
import { AddGroupComposer } from './AddGroupComposer'
import { DragPreview } from './DragPreview'
import { SortableGroupSection } from './SortableGroupSection'
import { TaskColumn } from './TaskColumn'

type TaskBoardProps = {
  sensors: DndContextProps['sensors']
  collisionDetection: CollisionDetection
  onDragStart: (event: DragStartEvent) => void
  onDragOver: (event: DragOverEvent) => void
  onDragEnd: (event: DragEndEvent) => void
  queueScrollRef: React.RefObject<HTMLDivElement | null>
  ungroupedTaskIds: string[]
  taskMap: Map<string, Task>
  groupNameMap: Map<string, string>
  backlogMirrorBySourceId: Map<string, string>
  completingTaskIds: Set<string>
  overTaskId: string | null
  overPosition: 'before' | 'after'
  groups: Group[]
  groupTaskIds: Map<string, string[]>
  groupProgress: Map<string, { done: number; total: number }>
  activeTaskId: string | null
  activeGroup: Group | null
  onToggleTask: (taskId: string) => void
  onUpdateTask: (taskId: string, value: string) => void
  onDeleteTask: (taskId: string) => void
  onAddToBacklog: (taskId: string) => void
  onRemoveFromBacklog: (taskId: string) => void
  onClearBacklog: () => void
  onClearCompletedBacklog: () => void
  onClearOpenBacklog: () => void
  onToggleGroupCollapsed: (groupId: string) => void
  onRenameGroup: (groupId: string, name: string) => void
  onDeleteGroup: (groupId: string) => void
  onCreateTaskInGroup: (value: string, groupId?: string) => void
  onCreateTasksFromPaste: (value: string, groupId?: string) => void
  onCreateGroup: (name: string) => void
}

export function TaskBoard({
  sensors,
  collisionDetection,
  onDragStart,
  onDragOver,
  onDragEnd,
  queueScrollRef,
  ungroupedTaskIds,
  taskMap,
  groupNameMap,
  backlogMirrorBySourceId,
  completingTaskIds,
  overTaskId,
  overPosition,
  groups,
  groupTaskIds,
  groupProgress,
  activeTaskId,
  activeGroup,
  onToggleTask,
  onUpdateTask,
  onDeleteTask,
  onAddToBacklog,
  onRemoveFromBacklog,
  onClearBacklog,
  onClearCompletedBacklog,
  onClearOpenBacklog,
  onToggleGroupCollapsed,
  onRenameGroup,
  onDeleteGroup,
  onCreateTaskInGroup,
  onCreateTasksFromPaste,
  onCreateGroup,
}: TaskBoardProps) {
  return (
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
            onToggle={onToggleTask}
            onUpdate={onUpdateTask}
            onDelete={onDeleteTask}
            onAddToBacklog={onAddToBacklog}
            onRemoveFromBacklog={onRemoveFromBacklog}
            onClearBacklog={onClearBacklog}
            onClearCompletedBacklog={onClearCompletedBacklog}
            onClearOpenBacklog={onClearOpenBacklog}
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
                onToggleTask={onToggleTask}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                onAddToBacklog={onAddToBacklog}
                onRemoveFromBacklog={onRemoveFromBacklog}
                onToggleGroupCollapsed={onToggleGroupCollapsed}
                onRenameGroup={onRenameGroup}
                onDeleteGroup={onDeleteGroup}
                onCreateTaskInGroup={onCreateTaskInGroup}
                onCreateTasksFromPaste={onCreateTasksFromPaste}
              />
            ))}
          </SortableContext>

          <section className="task-column add-group-block">
            <header className="task-column-title">Groups</header>
            <div className="task-column-shell">
              <AddGroupComposer onCreateGroup={onCreateGroup} />
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
  )
}
