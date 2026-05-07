import {
  PhysicalPosition,
  LogicalSize,
  currentMonitor,
  getCurrentWindow,
} from '@tauri-apps/api/window'
import type { UnlistenFn } from '@tauri-apps/api/event'

const SNAP_THRESHOLD = 52
const SNAP_PADDING = 12
export type WindowCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

function computeCornerPosition(
  corner: WindowCorner,
  monitor: NonNullable<Awaited<ReturnType<typeof currentMonitor>>>,
  windowSize: { width: number; height: number },
): { x: number; y: number } {
  const left = monitor.workArea.position.x + SNAP_PADDING
  const top = monitor.workArea.position.y + SNAP_PADDING
  const right = monitor.workArea.position.x + monitor.workArea.size.width - windowSize.width - SNAP_PADDING
  const bottom = monitor.workArea.position.y + monitor.workArea.size.height - windowSize.height - SNAP_PADDING

  switch (corner) {
    case 'top-left':
      return { x: left, y: top }
    case 'top-right':
      return { x: right, y: top }
    case 'bottom-left':
      return { x: left, y: bottom }
    case 'bottom-right':
      return { x: right, y: bottom }
  }
}

export async function applyWindowSize(width: number, height: number): Promise<void> {
  const appWindow = getCurrentWindow()
  await appWindow.setSize(new LogicalSize(width, height))
}

export async function applyStickyMode(sticky: boolean): Promise<void> {
  const appWindow = getCurrentWindow()
  await appWindow.setAlwaysOnTop(sticky)
}

export async function toggleWindowVisibility(): Promise<void> {
  const appWindow = getCurrentWindow()
  const visible = await appWindow.isVisible()
  if (visible) {
    await appWindow.hide()
    return
  }
  await appWindow.show()
  await appWindow.setFocus()
}

export async function minimizeWindow(): Promise<void> {
  await getCurrentWindow().minimize()
}

export async function closeWindow(): Promise<void> {
  await getCurrentWindow().close()
}

export async function startWindowDragging(): Promise<void> {
  await getCurrentWindow().startDragging()
}

export async function observeWindowResize(onResize: (width: number, height: number) => void): Promise<UnlistenFn> {
  const appWindow = getCurrentWindow()
  return appWindow.onResized(({ payload }) => {
    onResize(payload.width, payload.height)
  })
}

export async function snapWindowToCorner(): Promise<void> {
  const appWindow = getCurrentWindow()
  const monitor = await currentMonitor()

  if (!monitor) {
    return
  }

  const windowPosition = await appWindow.outerPosition()
  const windowSize = await appWindow.outerSize()

  const left = monitor.workArea.position.x + SNAP_PADDING
  const top = monitor.workArea.position.y + SNAP_PADDING
  const right = monitor.workArea.position.x + monitor.workArea.size.width - windowSize.width - SNAP_PADDING
  const bottom = monitor.workArea.position.y + monitor.workArea.size.height - windowSize.height - SNAP_PADDING

  const corners = [
    { x: left, y: top },
    { x: right, y: top },
    { x: left, y: bottom },
    { x: right, y: bottom },
  ]

  let bestCorner = corners[0]
  let bestDistance = Number.POSITIVE_INFINITY
  let bestIndex = 0

  for (const [index, corner] of corners.entries()) {
    const distance = Math.hypot(windowPosition.x - corner.x, windowPosition.y - corner.y)
    if (distance < bestDistance) {
      bestDistance = distance
      bestCorner = corner
      bestIndex = index
    }
  }

  const cornerToUse = bestDistance <= SNAP_THRESHOLD ? corners[(bestIndex + 1) % corners.length] : bestCorner
  await appWindow.setPosition(new PhysicalPosition(cornerToUse.x, cornerToUse.y))
}

export async function dockWindowToCorner(corner: WindowCorner): Promise<void> {
  const appWindow = getCurrentWindow()
  const monitor = await currentMonitor()
  if (!monitor) {
    return
  }

  const windowSize = await appWindow.outerSize()
  const position = computeCornerPosition(corner, monitor, windowSize)
  await appWindow.setPosition(new PhysicalPosition(position.x, position.y))
}
