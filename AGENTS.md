# livery

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

livery ("Paint your cockpit") is the Black Atom theme management CLI. It applies themes across all
supported developer tools from a single interactive picker, with plans for theme downloading and
configuration management.

Part of the [Black Atom Industries](https://github.com/black-atom-industries) cockpit — **radar**
(file nav) + **helm** (workspace nav) + **livery** (theme management).

**Name origin**: In aviation, _livery_ is the paint scheme of an aircraft — its visual identity.
Livery paints your development cockpit.

> **Early development**: This project is in its initial design phase. The architecture, configuration
> format, and file structure described below are a **design draft** and subject to change.

## Tech Stack

- **Runtime**: Deno
- **UI Framework**: Ink (React for CLIs) via `npm:` specifiers
- **React**: 18.x with automatic JSX transform (`react-jsx`)
- **Config**: `~/.config/black-atom/livery/config.json`

## Commands

```bash
deno task dev       # Run the picker
deno task check     # Type-check all source files
deno task lint      # Run deno lint
deno task compile   # Compile to single binary (./livery)
```

## Architecture (Draft)

```
src/
  main.tsx                # Entry point: load config + themes, render <App>
  types.ts                # All shared types (LiveryConfig, ToolConfig, ThemeEntry, etc.)
  config.ts               # Config loading from ~/.config/black-atom/livery/config.json
  themes.ts               # Load themes.json, group by collection
  app.tsx                 # Root Ink component (state machine: picking → applying → done)
  lib/
    paths.ts              # Path utilities (expandTilde, getHome)
    deep-merge.ts         # Recursive object merge
  components/
    theme-picker.tsx      # Interactive theme selector (@inkjs/ui Select)
    progress-view.tsx     # Updater progress display (spinners/checkmarks)
    status-line.tsx       # Current theme + appearance header
  updaters/
    mod.ts                # Updater registry + async generator runner
    types.ts              # Updater interface
    nvim.ts               # Replace colorscheme in config.lua, restart via tmux
    tmux.ts               # Swap source-file path, reload
    ghostty.ts            # Update theme line, SIGUSR2 reload
    zed.ts                # Update settings.json theme.dark/light
    delta.ts              # Toggle dark/light comments in .gitconfig
    system-appearance.ts  # macOS/Linux dark/light mode toggle
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

`themes.json` at the repo root contains all 32 themes across 5 collections. This is a static copy
from the dots repo (themes section only, no tools section). The picker owns tool configuration
separately.

## Planned Commands

| Command                     | Version | Description                              |
| --------------------------- | ------- | ---------------------------------------- |
| `livery pick`               | v0.1.0  | Interactive theme picker                 |
| `livery init`               | v0.2.0  | Generate config with detected tool paths |
| `livery download <adapter>` | v0.3.0  | Download theme files from GitHub         |
| `livery status`             | v0.3.0  | Show current theme + installed adapters  |

## Project Tracking

Issues are tracked in [Linear](https://linear.app/black-atom-industries) under the Development team
in the **livery** project.

---

> **Note to Claude:** This file is named `AGENTS.md` with a symlink `CLAUDE.md -> AGENTS.md` because
> Anthropic's Claude Code does not yet support `AGENTS.md` as a context file. Once Claude Code
> supports `AGENTS.md` natively, the symlink can be removed.
