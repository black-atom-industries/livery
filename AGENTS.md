# livery

Theme management desktop app for [Black Atom Industries](https://github.com/black-atom-industries).
Pick a theme once, apply it across all configured developer tools simultaneously.

## Architecture

**TypeScript (frontend) = orchestrator.** Decides _what_ to do. **Rust (backend) = executor.** Does
_how_ to do it — all OS operations.

No direct file system access from TypeScript. No shell commands from TypeScript.

See [DESIGN.md](DESIGN.md) for config decisions, updater flow, and data architecture.

## Shared Language

See [GLOSSARY.md](GLOSSARY.md) for ubiquitous terms.

## Scoped Context

- **Frontend:** [src/AGENTS.md](src/AGENTS.md) — React patterns, TypeScript, Deno
- **Backend:** [src-tauri/AGENTS.md](src-tauri/AGENTS.md) — Rust commands, file_ops, config module

## Project Tracking

Issues tracked in [Linear](https://linear.app/black-atom-industries) under the **livery** project.

## Sources of Truth

- **Tauri v2**: https://tauri.app/
- **TanStack Query/Router/Store**: https://tanstack.com/
- **@black-atom/core**: https://jsr.io/@black-atom/core
- **Deno**: https://docs.deno.com/
