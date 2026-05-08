import {
  PhysicalPosition,
  LogicalSize,
  currentMonitor,
  getCurrentWindow,
} from '@tauri-apps/api/window'
import type { UnlistenFn } from '@tauri-apps/api/event'

const SNAP_THRESHOLD = 52
const SNAP_PADDING = 12
const EDGE_DOCK_PEEK = 26
export type WindowCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type WindowEdge = 'left' | 'right'

type EdgeDockOptions = {
  animate?: boolean
  durationMs?: number
}

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

export async function applyWindowPosition(x: number, y: number): Promise<void> {
  const appWindow = getCurrentWindow()
  await appWindow.setPosition(new PhysicalPosition(x, y))
}

export async function getWindowPosition(): Promise<{ x: number; y: number }> {
  const position = await getCurrentWindow().outerPosition()
  return { x: position.x, y: position.y }
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
  const appWindow = getCurrentWindow()
  await appWindow.setFocus()
  await appWindow.startDragging()
}

export async function focusWindow(): Promise<void> {
  await getCurrentWindow().setFocus()
}

async function animateWindowToX(
  appWindow: ReturnType<typeof getCurrentWindow>,
  fromX: number,
  toX: number,
  y: number,
  durationMs: number,
): Promise<void> {
  if (fromX === toX || durationMs <= 0) {
    await appWindow.setPosition(new PhysicalPosition(toX, y))
    return
  }

  const start = performance.now()
  while (true) {
    const elapsed = performance.now() - start
    const progress = Math.min(1, elapsed / durationMs)
    const eased = 1 - Math.pow(1 - progress, 3)
    const nextX = Math.round(fromX + (toX - fromX) * eased)

    await appWindow.setPosition(new PhysicalPosition(nextX, y))

    if (progress >= 1) {
      break
    }

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve())
    })
  }
}

export async function observeWindowResize(onResize: (width: number, height: number) => void): Promise<UnlistenFn> {
  const appWindow = getCurrentWindow()
  return appWindow.onResized(async ({ payload }) => {
    const scale = await appWindow.scaleFactor()
    onResize(Math.round(payload.width / scale), Math.round(payload.height / scale))
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

export async function dockWindowToEdge(edge: WindowEdge, hidden = false, options?: EdgeDockOptions): Promise<void> {
  const appWindow = getCurrentWindow()
  const monitor = await currentMonitor()
  if (!monitor) {
    return
  }

  const windowSize = await appWindow.outerSize()
  const windowPosition = await appWindow.outerPosition()

  const minY = monitor.workArea.position.y + SNAP_PADDING
  const maxY = monitor.workArea.position.y + monitor.workArea.size.height - windowSize.height - SNAP_PADDING
  const nextY = Math.max(minY, Math.min(maxY, windowPosition.y))

  // Keep revealed dock window flush with the monitor edge to avoid hover flicker.
  const visibleLeftX = monitor.workArea.position.x
  const visibleRightX = monitor.workArea.position.x + monitor.workArea.size.width - windowSize.width
  const hiddenLeftX = monitor.workArea.position.x - windowSize.width + EDGE_DOCK_PEEK
  const hiddenRightX = monitor.workArea.position.x + monitor.workArea.size.width - EDGE_DOCK_PEEK

  const nextX =
    edge === 'left'
      ? hidden
        ? hiddenLeftX
        : visibleLeftX
      : hidden
        ? hiddenRightX
        : visibleRightX

  const shouldAnimate = options?.animate ?? false
  if (!shouldAnimate) {
    await appWindow.setPosition(new PhysicalPosition(nextX, nextY))
    return
  }

  const durationMs = options?.durationMs ?? 220
  await animateWindowToX(appWindow, windowPosition.x, nextX, nextY, durationMs)
}
