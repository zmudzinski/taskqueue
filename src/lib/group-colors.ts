import type { CSSProperties } from 'react'
import type { Group, GroupColor } from '../types'

type Swatch = { id: string; label: string; dot: string; fg: string }

export const GROUP_COLORS: Swatch[] = [
  { id: 'violet', label: 'Violet', dot: '#a48bf5', fg: '#6141d1' },
  { id: 'indigo', label: 'Indigo', dot: '#8b9cf7', fg: '#3d4fc4' },
  { id: 'blue', label: 'Sky', dot: '#6db8f2', fg: '#1b6fae' },
  { id: 'teal', label: 'Teal', dot: '#5cc2c2', fg: '#187a7a' },
  { id: 'green', label: 'Green', dot: '#6cc892', fg: '#23804c' },
  { id: 'lime', label: 'Lime', dot: '#a9d36a', fg: '#56801a' },
  { id: 'yellow', label: 'Yellow', dot: '#e9c34a', fg: '#8c6a07' },
  { id: 'orange', label: 'Orange', dot: '#f5a35e', fg: '#b85a0c' },
  { id: 'coral', label: 'Coral', dot: '#f2867a', fg: '#b83a2c' },
  { id: 'pink', label: 'Pink', dot: '#f08bb6', fg: '#b8366f' },
  { id: 'sand', label: 'Sand', dot: '#cdb08c', fg: '#7f6240' },
  { id: 'slate', label: 'Slate', dot: '#9aa7ba', fg: '#4a5568' },
]

// Auto-assignment order: alternate hues so neighbouring groups stay distinct.
const AUTO_ORDER = ['violet', 'orange', 'green', 'pink', 'teal', 'yellow', 'blue', 'coral', 'lime', 'indigo', 'sand', 'slate']

const HEX_PATTERN = /^#[0-9a-f]{6}$/i

export function normalizeHex(value: string): string | null {
  const trimmed = value.trim().replace(/^#?/, '#')
  const expanded = /^#[0-9a-f]{3}$/i.test(trimmed)
    ? `#${trimmed.slice(1).split('').map((char) => char + char).join('')}`
    : trimmed
  return HEX_PATTERN.test(expanded) ? expanded.toLowerCase() : null
}

export function getGroupColorDot(color: GroupColor): string {
  return GROUP_COLORS.find((swatch) => swatch.id === color)?.dot ?? normalizeHex(color) ?? GROUP_COLORS[0].dot
}

// Inline CSS vars consumed by the [data-color] rules in board.css.
export function groupColorStyle(color: GroupColor | undefined): CSSProperties | undefined {
  if (!color) {
    return undefined
  }

  const swatch = GROUP_COLORS.find((entry) => entry.id === color)
  const dot = swatch?.dot ?? getGroupColorDot(color)
  const fg = swatch?.fg ?? `color-mix(in srgb, ${dot} 62%, #000)`
  return { '--group-dot': dot, '--group-fg-light': fg } as CSSProperties
}

// Groups created before colors existed have no stored color; derive one from position.
export function resolveGroupColor(group: Group, index: number): GroupColor {
  return group.color ?? AUTO_ORDER[index % AUTO_ORDER.length]
}

export function pickNextGroupColor(groups: Group[]): GroupColor {
  const used = groups.map((group, index) => resolveGroupColor(group, index))
  return AUTO_ORDER.find((id) => !used.includes(id)) ?? AUTO_ORDER[groups.length % AUTO_ORDER.length]
}
