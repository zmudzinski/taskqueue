import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

type DropdownMenuProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactNode
  children: ReactNode
  contentClassName?: string
}

export function DropdownMenu({
  open,
  onOpenChange,
  trigger,
  children,
  contentClassName = '',
}: DropdownMenuProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (target && rootRef.current?.contains(target)) {
        return
      }
      onOpenChange(false)
    }

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onEsc)

    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onEsc)
    }
  }, [onOpenChange, open])

  return (
    <div className="ui-dropdown" ref={rootRef}>
      {trigger}
      {open ? <div className={`ui-dropdown-content ${contentClassName}`.trim()}>{children}</div> : null}
    </div>
  )
}
