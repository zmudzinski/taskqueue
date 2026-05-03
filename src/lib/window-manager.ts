import {
  PhysicalPosition,
  LogicalSize,
  currentMonitor,
  getCurrentWindow,
} from '@tauri-apps/api/window'

const SNAP_THRESHOLD = 52
const SNAP_PADDING = 12

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

  for (const corner of corners) {
    const distance = Math.hypot(windowPosition.x - corner.x, windowPosition.y - corner.y)
    if (distance < bestDistance) {
      bestDistance = distance
      bestCorner = corner
    }
  }

  if (bestDistance <= SNAP_THRESHOLD) {
    await appWindow.setPosition(new PhysicalPosition(bestCorner.x, bestCorner.y))
  }
}
