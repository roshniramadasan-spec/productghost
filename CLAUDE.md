# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ProductGhost is an Electron desktop app that runs in the system tray and periodically nudges product managers with relevant frameworks/advice from Lenny Rachitsky's podcast archive, based on what they're currently working on (detected via active window title + optional AI screen analysis).

## Commands

```bash
npm install                  # also runs electron-builder install-app-deps
npm run build:renderer       # vite build → ./dist/
npm run dev                  # vite (port 5222) + electron concurrently
npm start                    # electron . (loads ./dist/index.html — REQUIRES a prior build)
npm run build                # vite build + electron-builder → ./release/
```

There are no tests and no linter configured.

**Important:** `src/main/main.js` always loads the renderer via `loadFile("../../dist/index.html")` — it does NOT point at the Vite dev server. So `npm start` will show a blank window unless you've run `npm run build:renderer` first. `npm run dev` works because it waits on `http://localhost:5222` before launching electron, but the file: load in `main.js` means hot reload only takes effect if you edit `main.js` to load from the dev URL when developing.

## Architecture

Two processes communicate over a small IPC surface:

- **Main process** (`src/main/*.js`, CommonJS) — owns the SQLite database, the periodic capture/nudge cycle, the tray icon, and the floating overlay window. Entry point is `src/main/main.js`.
- **Renderer process** (`src/renderer/*.jsx`, ESM, React 19 + Tailwind v4 + Vite) — dashboard UI shown when the user opens the main window. Entry is `src/renderer/main.jsx` → `App.jsx`.

The renderer only talks to main via `window.electronAPI`, defined in `src/main/preload.js` and registered in `src/main/ipc.js`. When adding a new IPC channel, update both files. Main → renderer events go through `mainWindow.webContents.send(...)`; the whitelist of accepted channels lives in `preload.js` (`nudge-delivered`, `show-learn-more`).

### Nudge engine pipeline

`nudgeManager.js` runs `runCycle()` on an interval (default 4 min, configurable via `capture_interval` setting) plus a one-shot 8s after startup. Each cycle:

1. `captureEngine.captureScreen()` — grabs primary display via `desktopCapturer`, hashes the first 2000 chars of the base64 PNG, and returns `null` if unchanged (cheap dedup). Returns `null` when `privacy_screen_capture` setting is `"false"`.
2. `captureEngine.analyzeScreenContext(captureData)` — ALWAYS calls `detectActiveWindow()` first (this is the primary signal, not the screenshot). On Windows this shells out to PowerShell via a temp `.ps1` script that calls `GetForegroundWindow`/`GetWindowText` — packaged Electron's `desktopCapturer` truncates titles, so the native call is the source of truth. The title is fed through `parseWindowTitle()` (a long rule table mapping titles → `{app, work_type, topics}`). If an OpenAI `api_key` is set AND a screenshot was captured, results are merged with a `gpt-4o-mini` vision call — but real-app detection wins for `app`.
3. `matchingEngine.findMatches(context)` — keyword search against `knowledge_base.context_triggers`/`tags` in SQLite, then filters by recency (`cooldown_hours`, default 48), then applies a soft `topic_preferences` filter. Multi-layer fallback: direct keyword match → `BROAD_CONTEXT_MAP` for the activity category → random unshown entry. Returns top 3.
4. `nudgeWindow.showNudgeOverlay()` — opens a frameless, transparent, always-on-top, non-focusable 420×220 `BrowserWindow` in the bottom-right with an inline HTML/CSS card. Auto-dismisses after 15s. Also fires a native `Notification` as a backup. **This overlay window uses `nodeIntegration: true` + `contextIsolation: false`** (unlike the main window) so the embedded `<script>` can `require('electron')` directly to send `nudge-overlay-dismiss` / `nudge-overlay-learn-more` IPC messages.

Daily cap (`max_nudges_per_day`, default 6) is enforced before step 1.

### Database (`src/main/database.js`)

`better-sqlite3` at `app.getPath("userData")/productghost.db`, WAL mode. Four tables: `knowledge_base`, `nudge_history`, `settings`, `daily_stats`. `tags` and `context_triggers` are stored as JSON strings — `parseEntry()` unmarshals them; the seed insert uses `JSON.stringify`. Any new query that returns rows from `knowledge_base` must do the same parse.

**Version-mismatch wipe:** on init, if `settings.app_version` doesn't match the `APP_VERSION` constant in `database.js`, the entire DB file (plus `-wal`/`-shm`) is deleted and re-seeded. Bump `APP_VERSION` whenever you change the schema or want existing installs to re-seed; do NOT write incremental migrations.

Seed content lives in `src/main/seedData.js` — 20 entries, each with `context_triggers` (used by the matcher) and `tags` (used by the topic-preference filter and shown in UI). Adding a framework = appending to that array and bumping `APP_VERSION` so existing installs pick it up.

### Settings keys

Defaults are set in `initDefaultSettings()`. Notable keys: `enabled`, `capture_interval` (minutes), `max_nudges_per_day`, `relevance_threshold` (0–1 fraction of top score), `cooldown_hours`, `topic_preferences` (JSON array), `privacy_screen_capture`, `api_key`, `api_provider` ("openai"), `onboarding_complete`, `app_version`. `ipc.js` reacts to changes in `enabled` (start/stop engine) and `capture_interval`/`max_nudges_per_day` (restart engine) — add similar branches if a new setting needs to take effect without a restart.

### Tray-resident lifecycle

The app does not quit when the main window closes — `mainWindow.on("close")` hides instead, and `window-all-closed` is intentionally a no-op. Only the tray's "Quit" menu sets `isQuitting = true` and calls `app.quit()`. The first launch shows the dashboard for onboarding; subsequent launches stay hidden in the tray. `before-quit` calls `stopEngine()` to clear the capture interval.

### Renderer

Single `App.jsx` with tab state (`feed | settings | stats | about`) plus a modal `LearnMore` overlay and a first-run `Onboarding` flow gated by the `onboarding_complete` setting. Components live in `src/renderer/components/`. Path alias `@` → `src/renderer` is set in `vite.config.js`. Tailwind v4 is loaded via `@import "tailwindcss"` in `styles/index.css` (no `tailwind.config.js`; uses the v4 zero-config + Vite plugin setup). The custom frameless title bar uses `-webkit-app-region: drag` on `.drag-region` — when adding interactive elements inside that strip, give them `.no-drag`.

## Conventions

- Main process files use CommonJS `require`/`module.exports`. Renderer files use ESM `import`/`export`. Don't mix.
- Don't access `ipcRenderer` from renderer components — always go through `window.electronAPI`. The whitelist in `preload.js` is the contract.
- When adding a new app/window-title detection rule, edit the `appRules` array in `captureEngine.parseWindowTitle()` — order matters (first match wins), and browser detection must stay near the end because it's a catch-all that parses page titles via `parseBrowserTitle()`.
- The matcher must always return *something* when possible; if you tighten filters, add a fallback so empty-result cycles stay rare.
