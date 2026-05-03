# TaskQueue

Minimal floating desktop task queue built with Tauri, React, Vite, TypeScript, and Zustand.

## What it does

- Frameless transparent always-on-top window
- Floating mode: current task + next tasks
- Full mode: full queue with groups, editing, drag reorder, and completed section
- Multi-line paste support (one line = one task)
- Autosave (debounced) + manual save to AppData JSON
- Window controls: opacity, size, sticky mode
- Snap to screen corners after dragging
- Keyboard shortcuts:
  - Enter: create task
  - Cmd/Ctrl + V: paste multi-line tasks
  - Cmd/Ctrl + S: save now
  - Cmd/Ctrl + Shift + S: toggle window visibility

## Run

1. Install dependencies

```bash
npm install
```

2. Start desktop app

```bash
npm run tauri dev
```

## Build

```bash
npm run tauri build
```
