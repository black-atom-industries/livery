# livery

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

livery ("Paint your cockpit") is the Black Atom theme management desktop app. It applies themes
across all supported developer tools from a single interactive picker, with plans for theme
downloading and configuration management.

Part of the [Black Atom Industries](https://github.com/black-atom-industries) cockpit — **radar**
(file nav) + **helm** (workspace nav) + **livery** (theme management).

**Name origin**: In aviation, _livery_ is the paint scheme of an aircraft — its visual identity.
Livery paints your development cockpit.

## Tech Stack

- **Runtime**: Deno (frontend dev server, formatting, linting, testing)
- **App Shell**: Tauri v2 (Rust + webview)
- **UI**: React 18.x with React DOM
- **State**: TanStack Store (client state), TanStack Query (server state / config)
- **Build**: Vite (via Deno)
- **Styling**: Tailwind CSS v4
- **Config**: `~/.config/black-atom/livery/config.json`

## Architecture Boundary

**TypeScript (frontend) = orchestrator.** Manages UI, state, calling order. Decides _what_ to do.

**Rust (backend) = executor.** Handles all OS operations — file I/O, process signals, socket
communication. Does _how_ to do it.

Updaters call typed Rust commands via `invoke()`:

- `replace_in_file` — generic regex find-and-replace on any file
- `reload_ghostty`, `reload_nvim`, `reload_tmux` — app-specific reload signals
- `get_config`, `save_config` — config file management

No direct file system access from TypeScript. No shell commands from TypeScript.

## Commands

```bash
deno task dev           # Launch Tauri app in development mode
deno task build         # Build production app with Tauri
deno task vite:dev      # Run Vite dev server only (no Tauri)
deno task vite:build    # Build frontend only
deno task check         # Type-check all source files
deno task test          # Run tests (uses permissions from deno.json)
deno task checks        # Run check + lint + fmt + test (pre-commit hook)
deno task install-hooks # Install git pre-commit hook
deno lint               # Run deno lint
deno fmt                # Format code
cargo test              # Run Rust tests (from src-tauri/)
```

## Project Structure

```
src/
  main.tsx              # Entry point: React DOM + QueryClientProvider + TanStack DevTools
  index.css             # Tailwind CSS entry
  config.ts             # DEFAULT_CONFIG
  types/
    apps.ts             # AppName, AppConfig types
    config.ts           # Config type
    updaters.ts         # UpdateResult, UpdaterEntry types
  lib/
    updaters.ts         # Orchestration: getEnabledApps, createUpdaters, applyTheme
    updaters_test.ts    # Orchestration tests
    config.ts           # Config merging, path expansion
    paths.ts            # Path utilities (expandTilde)
    themes.ts           # Theme data pipeline (getGroupedThemes)
    progress.ts         # Progress state derivation
  queries/
    use-config.ts       # TanStack Query hook for config (server state)
  updaters/
    registry.ts         # UpdaterContext, AppUpdater type, updater registry
    defaults.ts         # Default match/replace patterns per app
    ghostty.ts          # Ghostty updater
    nvim.ts             # Neovim updater
    tmux.ts             # Tmux updater
    delta.ts            # Delta updater
  store/
    app.ts              # TanStack Store: phase, selectedTheme, updaterResults
  routes/
    __root.tsx          # Root layout: header, progress bar, footer
    index.tsx           # Theme picker (route = container)
    settings/route.tsx  # Settings placeholder
  components/           # Dumb UI components
src-tauri/
  Cargo.toml            # Rust dependencies
  tauri.conf.json       # Tauri window/app configuration
  capabilities/
    default.json        # Tauri permissions (core only — no FS/Shell plugins)
  src/
    main.rs             # Rust entry point
    lib.rs              # Tauri builder: command registration
    config.rs           # Config I/O: get_config, save_config, tilde expansion
    updaters/
      mod.rs            # Module declarations
      config_file.rs    # replace_in_file command (generic regex replace)
      ghostty.rs        # reload_ghostty (SIGUSR2)
      nvim.rs           # reload_nvim (socket discovery)
      tmux.rs           # reload_tmux (tmux source-file)
scripts/
  hooks/pre-commit      # Pre-commit hook (runs deno task checks)
```

## Configuration

Config lives at `~/.config/black-atom/livery/config.json`:

```json
{
    "system_appearance": true,
    "apps": {
        "ghostty": {
            "enabled": true,
            "config_path": "~/.config/ghostty/config"
        },
        "nvim": {
            "enabled": true,
            "config_path": "~/.config/nvim/lua/config.lua"
        },
        "tmux": {
            "enabled": true,
            "config_path": "~/.config/tmux/tmux.conf",
            "themes_path": "~/repos/black-atom-industries/tmux/themes"
        },
        "delta": {
            "enabled": true,
            "config_path": "~/.gitconfig.delta"
        }
    }
}
```

Key design decisions:

- **`enabled` flag per app.** Presence in config means configured, `enabled` controls whether it
  runs. Users can disable an app without losing their path settings.
- **`system_appearance`** is a top-level boolean — macOS/Linux dark mode is a system toggle, not an
  app config.
- **`themes_path`** is optional, only needed for apps that reference external theme files (e.g.
  tmux).
- **`match_pattern` / `replace_template`** are optional overrides per app. Each updater has sensible
  defaults in `src/updaters/defaults.ts`.
- **`~` expansion** is handled by Rust on read. Paths are stored with `~` on disk. `config_path` is
  expanded for the frontend; `themes_path` is NOT expanded (used in templates).

## Theme Data

Theme data comes from `@black-atom/core` (JSR). The `@deno/vite-plugin` handles JSR resolution for
Vite, so source code imports `@black-atom/core` directly without an npm compatibility layer.

## Coding Guidelines

See [docs/coding-guidelines.md](docs/coding-guidelines.md) for conventions on React patterns, file
structure, styling, TypeScript, testing, git workflow, and the Deno + Vite dual resolution setup.

## Project Tracking

Issues are tracked in [Linear](https://linear.app/black-atom-industries) under the Development team
in the **livery** project.

---

> **Note to Claude:** This file is named `AGENTS.md` with a symlink `CLAUDE.md -> AGENTS.md` because
> Anthropic's Claude Code does not yet support `AGENTS.md` as a context file. Once Claude Code
> supports `AGENTS.md` natively, the symlink can be removed.
