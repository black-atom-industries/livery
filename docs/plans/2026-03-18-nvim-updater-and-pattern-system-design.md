# Nvim Updater & Configurable Pattern System — Design Spec

**Date:** 2026-03-18
**Issue:** DEV-286 (nvim updater)

## Problem

The ghostty updater hardcodes its config replacement pattern. As we add more updaters (nvim, tmux,
zed, delta), each has a different config format. Users may also have non-standard config structures.
We need a generic, testable pattern system that all updaters share, with per-app defaults and
optional user overrides.

Additionally, the Shell plugin (`exec-sh`) is a security concern — all OS operations should go
through typed Rust commands instead of arbitrary shell execution.

## Decisions

1. **Generic `replaceConfigPattern` function** — shared by all updaters. Takes content, regex
   pattern, template with `{themeKey}` placeholder, and theme key. Pure string logic, fully testable.
2. **Optional `match_pattern` and `replace_template` on AppConfig** — each updater has built-in
   defaults. Users override only if their config diverges.
3. **Rust owns OS operations** — reload commands (`pkill`, nvim socket discovery, tmux reload)
   live in Rust as typed Tauri commands. Remove the Shell plugin entirely.
4. **Nvim live reload via sockets** — Neovim auto-creates server sockets. Rust finds them and
   sends `:colorscheme X`. No tmux dependency.

## Updated AppConfig

### TypeScript

```typescript
export interface AppConfig {
    enabled: boolean;
    config_path: string;
    themes_path?: string;
    match_pattern?: string;
    replace_template?: string;
}
```

### Rust

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(default = "default_true")]
    pub enabled: bool,
    pub config_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub themes_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub match_pattern: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub replace_template: Option<String>,
}
```

## Default Patterns

| App | Default `match_pattern` | Default `replace_template` |
|-|-|-|
| ghostty | `^theme\s*=\s*.+$` | `theme = {themeKey}.conf` |
| nvim | `colorscheme\s*=\s*"[^"]*"` | `colorscheme = "{themeKey}"` |

`{themeKey}` is the raw theme key from `@black-atom/core` (e.g., `black-atom-terra-spring-day`).
Each template handles formatting — ghostty appends `.conf`, nvim wraps in quotes.

The nvim default targets `colorscheme = "..."` in a Lua config table (the Black Atom nvim adapter
pattern). Users with `vim.cmd.colorscheme("...")` or other formats use `match_pattern` override.

Stored in `src/updaters/defaults.ts`. Updaters check `appConfig.match_pattern ?? DEFAULT_PATTERNS[appName].matchPattern`.

## Generic Pattern Replacer

```typescript
// src/lib/replace-config-pattern.ts

export function replaceConfigPattern(
    content: string,
    matchPattern: string,
    replaceTemplate: string,
    themeKey: string,
): string {
    const regex = new RegExp(matchPattern, "m");
    const rendered = replaceTemplate.replace("{themeKey}", themeKey);

    if (!regex.test(content)) {
        throw new Error(`Pattern not found: ${matchPattern}`);
    }

    // Replaces first match only. If a config has multiple matching lines,
    // only the first is updated — users should narrow their pattern.
    return content.replace(regex, rendered);
}
```

Ghostty's `replaceGhosttyTheme` is removed — replaced by `replaceConfigPattern` with ghostty
defaults. The ghostty tests become pattern replacer tests with ghostty-specific fixtures.

## Rust Reload Commands

### `src-tauri/src/updaters/ghostty.rs`

```rust
#[tauri::command]
pub fn reload_ghostty() -> Result<(), String> {
    // pkill -SIGUSR2 ghostty — ignore errors (not running is fine)
    std::process::Command::new("pkill")
        .args(["-SIGUSR2", "ghostty"])
        .output()
        .ok();
    Ok(())
}
```

### `src-tauri/src/updaters/nvim.rs`

```rust
#[tauri::command]
pub fn reload_nvim(theme_key: String) -> Result<(), String> {
    // Find nvim sockets matching $TMPDIR/nvim.*/*/nvim.*.0 and send :colorscheme
    let tmpdir = std::env::var("TMPDIR").unwrap_or_else(|_| "/tmp".to_string());
    // Glob for sockets, for each: nvim --server <socket> --remote-send ":colorscheme X<CR>"
    // Non-zero exit from nvim --server is fine — means that instance is gone
}
```

### Remove Shell Plugin

- Remove `tauri-plugin-shell` from `Cargo.toml`
- Remove `tauri_plugin_shell::init()` from `lib.rs`
- Remove `@tauri-apps/plugin-shell` from `deno.json`
- Remove `shell:allow-execute` from `capabilities/default.json`

## Nvim Updater Flow

1. **Persist**: read `config_path` → `replaceConfigPattern(content, pattern, template, themeKey)` → write back
2. **Live reload**: `invoke("reload_nvim", { themeKey })` — Rust finds sockets, sends `:colorscheme`

## File Structure

```
src/lib/
  replace-config-pattern.ts        # Generic pattern replacer (pure function)
  replace-config-pattern_test.ts   # Tests for ghostty, nvim, edge cases

src/updaters/
  registry.ts                      # AppName → updater function map
  defaults.ts                      # Default match_pattern + replace_template per app
  ghostty.ts                       # Ghostty updater (refactored)
  nvim.ts                          # Nvim updater (new)

src-tauri/src/
  config.rs                        # Config I/O (existing)
  updaters/
    mod.rs                         # Module declaration
    ghostty.rs                     # reload_ghostty command
    nvim.rs                        # reload_nvim command
  lib.rs                           # Register all commands
```

## Impact on Existing Code

### New Files

- `src/lib/replace-config-pattern.ts` — generic replacer
- `src/lib/replace-config-pattern_test.ts` — tests
- `src/updaters/defaults.ts` — default patterns per app
- `src/updaters/nvim.ts` — nvim updater
- `src-tauri/src/updaters/mod.rs` — Rust updaters module
- `src-tauri/src/updaters/ghostty.rs` — ghostty reload command
- `src-tauri/src/updaters/nvim.rs` — nvim reload command

### Modified Files

- `src/types/apps.ts` — add `match_pattern?` and `replace_template?`
- `src/updaters/ghostty.ts` — refactor to use `replaceConfigPattern` + `invoke("reload_ghostty")`
- `src/updaters/registry.ts` — add nvim entry
- `src-tauri/src/config.rs` — add optional fields to AppConfig struct
- `src-tauri/src/lib.rs` — register reload commands, remove shell plugin
- `src-tauri/Cargo.toml` — remove `tauri-plugin-shell`
- `src-tauri/capabilities/default.json` — remove `shell:allow-execute`
- `deno.json` — remove `@tauri-apps/plugin-shell`

### Removed Files

- `src/updaters/ghostty_test.ts` — tests move to `replace-config-pattern_test.ts`

## How to Test

### Automated

- `replace-config-pattern_test.ts`:
  - Ghostty pattern: replaces theme line, handles spaces, throws on missing
  - Nvim pattern: replaces colorscheme in Lua, handles quotes, preserves surrounding code
  - Custom pattern: user-provided regex works
  - Edge case: pattern found multiple times (only first replaced)
- `deno task check` — types pass
- `cargo check` — Rust compiles

### Manual: Ghostty (regression)

1. Run `deno task dev`, pick a theme
2. Verify ghostty config updated and terminal repaints
3. Confirm no shell plugin errors in console

### Manual: Nvim

1. Add nvim to config: `"nvim": { "enabled": true, "config_path": "~/.config/nvim/lua/config.lua" }`
2. Restart app, pick a theme
3. Verify: nvim config file updated with new colorscheme
4. Verify: all running nvim instances switch live
5. Restart nvim — verify persisted theme loads

### Manual: Custom Pattern

1. Override nvim pattern in config with a custom regex
2. Pick a theme
3. Verify the custom pattern is used for replacement
