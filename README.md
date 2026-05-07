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

## Release and Auto-Update (Free Setup, No Apple Developer Account)

This project is configured to release through GitHub Actions and update installed apps automatically using Tauri Updater.

Important note:
- This setup is fully free.
- It does not use Apple notarization (requires paid Apple Developer Program).
- On a different Mac, the first launch may require manual confirmation in Gatekeeper.

### How the release flow works

1. You run `npm run release` locally.
2. The script asks which version to bump (`major`, `minor`, `patch`).
3. The script asks release channel (`stable`, `alpha`, `beta`, `rc`).
4. It updates versions in project files, creates commit + tag, and pushes to GitHub.
5. GitHub Actions builds the macOS universal app and publishes a GitHub Release.
6. Installed app instances detect a new version and show an in-app update prompt.

### Step-by-step setup

#### 1. Generate Tauri updater keypair (one time)

Run locally:

```bash
npx tauri signer generate -w .tauri/taskqueue.key
```

This prints a public key and stores a private key in `.tauri/taskqueue.key`.

The `.tauri` folder is gitignored in this repository, so keys cannot be committed by accident.

#### 2. Add updater public key to Tauri config

Open `src-tauri/tauri.conf.json` and replace:

```json
"pubkey": "REPLACE_WITH_OUTPUT_OF: npm run tauri signer generate"
```

with the actual public key printed in step 1.

#### 3. Add GitHub repository secrets

Go to GitHub repository settings:
- `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

Create these secrets:

- `TAURI_SIGNING_PRIVATE_KEY`
  - Value: full content of `.tauri/taskqueue.key`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
  - Value: password used during key generation (can be empty string if no password)

#### 4. Create your first release

Run:

```bash
npm run release
```

The script will:
- ask version bump type (`major`/`minor`/`patch`)
- ask channel (`stable`/`alpha`/`beta`/`rc`)
- ask pre-release number for non-stable channels (for example `beta.1`)
- update versions
- create git commit and git tag
- push commit and tag

After push, GitHub Actions workflow (`.github/workflows/release.yml`) runs automatically.

#### 5. Verify GitHub release artifacts

In GitHub Releases, confirm these files are present:
- `TaskQueue_*_universal.dmg`
- `TaskQueue.app.tar.gz`
- `TaskQueue.app.tar.gz.sig`
- `latest.json`

These are required for installer distribution and auto-update checks.

### Versioning and channels

Examples:
- Stable: `1.2.3`
- Alpha: `1.3.0-alpha.1`
- Beta: `1.3.0-beta.2`
- RC: `1.3.0-rc.1`

Tags are created as:
- `v1.2.3`
- `v1.3.0-beta.2`

GitHub workflow automatically marks `alpha`, `beta`, and `rc` tags as pre-releases.

### Installing on another Mac (without Apple notarization)

Because this is a free setup (no Apple Developer account), macOS may block first launch.

Use one of these options:

1. Finder flow (recommended for most users)
   - Open the DMG and copy app to Applications
   - Right-click the app -> `Open` -> `Open`

2. Terminal flow

```bash
xattr -dr com.apple.quarantine /Applications/TaskQueue.app
```

After first approval, app launches normally.

### Local build vs CI/CD build

Recommended approach:
- Use CI/CD (GitHub Actions) for all official releases.
- Use local builds only for development/testing.

Why:
- reproducible release process
- automatic GitHub Release creation
- cleaner version/tag history
- built-in updater artifact publishing
