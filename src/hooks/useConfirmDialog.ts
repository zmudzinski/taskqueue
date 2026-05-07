import { useState } from 'react'
import type { ConfirmRequest } from '../types'

type UseConfirmDialogResult = {
  confirmRequest: ConfirmRequest | null
  setConfirmRequest: (request: ConfirmRequest | null) => void
  requestDeleteTask: (taskId: string, onDelete: (taskId: string) => void) => void
  requestDeleteGroup: (groupId: string, groupName: string, onDelete: (groupId: string) => void) => void
  requestPurgeCompleted: (onPurge: () => void) => void
}

export function useConfirmDialog(): UseConfirmDialogResult {
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null)

  const requestDeleteTask = (taskId: string, onDelete: (taskId: string) => void) => {
    setConfirmRequest({
      title: 'Delete task',
      message: 'Delete this task?',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => onDelete(taskId),
    })
  }

  const requestDeleteGroup = (groupId: string, groupName: string, onDelete: (groupId: string) => void) => {
    setConfirmRequest({
      title: 'Delete group',
      message: `Delete "${groupName}"? Tasks will be moved to Today.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => onDelete(groupId),
    })
  }

  const requestPurgeCompleted = (onPurge: () => void) => {
    setConfirmRequest({
      title: 'Delete completed tasks',
      message: 'Delete all completed tasks?',
      confirmLabel: 'Delete all',
      destructive: true,
      onConfirm: onPurge,
    })
  }

  return {
    confirmRequest,
    setConfirmRequest,
    requestDeleteTask,
    requestDeleteGroup,
    requestPurgeCompleted,
  }
}
