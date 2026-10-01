import { useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { Button } from './ui/Button'

type UnifiedComposerProps = {
  groupId?: string
  placeholder?: string
  onCreateTask: (value: string, groupId?: string) => void
  onCreateTasksFromPaste?: (value: string, groupId?: string) => void
}

export function UnifiedComposer({
  groupId,
  placeholder,
  onCreateTask,
  onCreateTasksFromPaste,
}: UnifiedComposerProps) {
  const [value, setValue] = useState('')

  const submit = () => {
    const normalized = value.trim()
    if (!normalized) {
      return
    }

    onCreateTask(normalized, groupId)

    setValue('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  }

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const payload = event.clipboardData.getData('text')
    if (!payload.includes('\n')) {
      return
    }

    event.preventDefault()
    onCreateTasksFromPaste?.(payload, groupId)
    setValue('')
  }

  return (
    <section className="composer">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        placeholder={placeholder ?? 'Add task...'}
      />

      <Button type="button" className="composer-add" size="icon" aria-label="Add" onClick={submit}>
        +
      </Button>
    </section>
  )
}
