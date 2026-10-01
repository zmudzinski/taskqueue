import { useState } from 'react'
import { GROUP_COLORS, getGroupColorDot, groupColorStyle, normalizeHex } from '../lib/group-colors'
import type { GroupColor } from '../types'
import { DropdownMenu } from './ui/DropdownMenu'

type GroupColorPickerProps = {
  color: GroupColor
  onChange: (color: GroupColor) => void
}

export function GroupColorPicker({ color, onChange }: GroupColorPickerProps) {
  const [open, setOpen] = useState(false)
  const [hexDraft, setHexDraft] = useState('')
  const draftHex = normalizeHex(hexDraft)

  const openMenu = () => {
    setHexDraft(getGroupColorDot(color))
    setOpen(true)
  }

  const select = (next: GroupColor) => {
    onChange(next)
    setOpen(false)
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={setOpen}
      contentClassName="group-color-menu"
      trigger={
        <button
          type="button"
          className="group-color-dot"
          aria-label="Change group color"
          onClick={() => (open ? setOpen(false) : openMenu())}
        />
      }
    >
      <div className="group-color-swatches">
        {GROUP_COLORS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`group-color-swatch ${option.id === color ? 'is-active' : ''}`}
            data-color={option.id}
            style={groupColorStyle(option.id)}
            aria-label={option.label}
            title={option.label}
            onClick={() => select(option.id)}
          />
        ))}
      </div>

      <form
        className="group-color-custom"
        onSubmit={(event) => {
          event.preventDefault()
          if (draftHex) {
            select(draftHex)
          }
        }}
      >
        <label className="group-color-native" style={{ background: draftHex ?? 'transparent' }} title="Pick custom color">
          <input
            type="color"
            value={draftHex ?? '#000000'}
            onChange={(event) => setHexDraft(event.target.value)}
            aria-label="Pick custom color"
          />
        </label>
        <input
          className="group-color-hex"
          value={hexDraft}
          onChange={(event) => setHexDraft(event.target.value)}
          placeholder="#a48bf5"
          maxLength={7}
          spellCheck={false}
          aria-label="Custom color hex"
          aria-invalid={!draftHex}
        />
        <button type="submit" className="group-color-apply" disabled={!draftHex}>
          Set
        </button>
      </form>
    </DropdownMenu>
  )
}
