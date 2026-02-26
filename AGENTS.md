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

> **Early development**: This project is in its initial design phase. The architecture,
> configuration format, and file structure described below are a **design draft** and subject to
> change.

## Tech Stack

- **Runtime**: Deno (frontend dev server, formatting, linting, testing)
- **App Shell**: Tauri v2 (Rust + webview)
- **UI**: React 18.x with React DOM
- **Build**: Vite (via Deno)
- **Styling**: Tailwind CSS v4
- **Config**: `~/.config/black-atom/livery/config.json`

## Commands

```bash
deno task dev         # Launch Tauri app in development mode
deno task build       # Build production app with Tauri
deno task vite:dev    # Run Vite dev server only (no Tauri)
deno task vite:build  # Build frontend only
deno task check       # Type-check all source files
deno task lint        # Run deno lint
deno task test        # Run tests
deno task fmt         # Format code
```

## Architecture (Draft)

```
src/
  main.tsx              # Entry point: render React DOM into webview
  index.css             # Tailwind CSS entry
  config.ts             # DEFAULT_CONFIG
  types/
    config.ts           # LiveryConfig, ToolConfig types
  lib/
    paths.ts            # Path utilities (expandTilde, getHome)
    config.ts           # Config loading, merging, path expansion
    themes.ts           # Theme data pipeline (getThemeEntries, buildPickerOptions)
    deep-merge.ts       # Recursive object merge
  containers/
    app.tsx             # Root container (smart component)
  components/           # Dumb UI components (future)
  updaters/
    .gitkeep            # Theme updaters (future)
src-tauri/
  Cargo.toml            # Rust dependencies
  tauri.conf.json       # Tauri window/app configuration
  src/
    main.rs             # Rust entry point
    lib.rs              # Tauri builder setup
```

## Configuration (Draft)

Config lives at `~/.config/black-atom/livery/config.json`:

```json
{
    "system_appearance": true,
    "tools": {
        "nvim": { "config_path": "~/.config/nvim/lua/config.lua" },
        "tmux": {
            "config_path": "~/.config/tmux/themes.conf",
            "themes_path": "~/repos/black-atom-industries/tmux/themes"
        },
        "ghostty": { "config_path": "~/.config/ghostty/config" },
        "zed": { "config_path": "~/.config/zed/settings.json" },
        "delta": { "config_path": "~/.gitconfig" }
    }
}
```

Key design decisions:

- **Tools omitted = skipped.** No `enabled` flags. Presence in config means enabled.
- **No default paths.** Users declare their paths explicitly (via `livery init` in v0.2).
- **`system_appearance`** is a top-level boolean, not a tool — macOS/Linux dark mode is a system
  toggle, not a config file edit.
- **`themes_path`** is optional, only needed for tools that reference external theme files (e.g.
  tmux).
- **`~` expansion** is handled automatically on all paths.

## Theme Data

Theme data comes from `@black-atom/core` (JSR). The `@deno/vite-plugin` handles JSR resolution for
Vite, so source code imports `@black-atom/core` directly without an npm compatibility layer.

## Planned Commands

| Command                     | Version | Description                              |
| --------------------------- | ------- | ---------------------------------------- |
| `livery pick`               | v0.1.0  | Interactive theme picker                 |
| `livery init`               | v0.2.0  | Generate config with detected tool paths |
| `livery download <adapter>` | v0.3.0  | Download theme files from GitHub         |
| `livery status`             | v0.3.0  | Show current theme + installed adapters  |

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
