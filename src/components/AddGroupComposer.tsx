import { useState, type KeyboardEvent } from 'react'
import { Button } from './ui/Button'

type AddGroupComposerProps = {
  onCreateGroup: (name: string) => void
}

export function AddGroupComposer({ onCreateGroup }: AddGroupComposerProps) {
  const [value, setValue] = useState('')

  const submit = () => {
    const normalized = value.trim()
    if (!normalized) {
      return
    }

    onCreateGroup(normalized)
    setValue('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  }

  return (
    <section className="composer group-composer">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Add group..."
      />

      <Button type="button" className="composer-add" size="icon" aria-label="Add group" onClick={submit}>
        +
      </Button>
    </section>
  )
}
