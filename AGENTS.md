# livery

livery ("Paint your cockpit") is the Black Atom theme management desktop app. Pick a theme once,
apply it across all configured developer tools simultaneously.

Part of the [Black Atom Industries](https://github.com/black-atom-industries) cockpit — **radar**
(file nav) + **helm** (workspace nav) + **livery** (theme management).

## Architecture Boundary

**TypeScript (frontend) = orchestrator.** Manages UI, state, calling order. Decides _what_ to do.

**Rust (backend) = executor.** Handles all OS operations — file I/O, process signals, socket
communication. Does _how_ to do it.

Updaters call typed Rust commands via `invoke()`:

- `replace_in_file` — generic regex find-and-replace on any file
- `reload_ghostty`, `reload_nvim`, `reload_tmux` — app-specific reload signals
- `get_config`, `save_config` — config file management with default merging

No direct file system access from TypeScript. No shell commands from TypeScript.

## Configuration Design Decisions

- **`enabled` flag per app.** Presence in config means configured, `enabled` controls whether it
  runs. Users can disable an app without losing their path settings.
- **Default patterns in Rust.** `match_pattern` / `replace_template` defaults live in
  `Config::default()` (`src-tauri/src/config/types.rs`). Merged into user configs on read.
- **`~` expansion** handled by Rust. `config_path` is expanded for the frontend; `themes_path` is
  NOT expanded (used in templates).
- **Delta** uses a separate `~/.gitconfig.delta` include file, not `.gitconfig` directly.

## Coding Guidelines

See [docs/coding-guidelines.md](docs/coding-guidelines.md) for React patterns, file structure,
styling, TypeScript, testing, and git workflow conventions.

## Project Tracking

Issues tracked in [Linear](https://linear.app/black-atom-industries) under the **livery** project.

## Sources of Truth

- **Tauri v2 docs**: https://tauri.app/
- **TanStack Query docs**: https://tanstack.com/query/latest
- **TanStack Router docs**: https://tanstack.com/router/latest
- **TanStack Store docs**: https://tanstack.com/store/latest
- **@black-atom/core**: https://jsr.io/@black-atom/core
- **Deno docs**: https://docs.deno.com/

---

> **Note to Claude:** This file is named `AGENTS.md` with a symlink `CLAUDE.md -> AGENTS.md` because
> Anthropic's Claude Code does not yet support `AGENTS.md` as a context file. Once Claude Code
> supports `AGENTS.md` natively, the symlink can be removed.
