# Nvim Updater & Configurable Pattern System — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents
> available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`)
> syntax for tracking.

**Goal:** Add a generic config pattern replacer, move OS operations to Rust commands, refactor the
ghostty updater to use both, and implement the nvim updater with socket-based live reload.

**Architecture:** A shared `replaceConfigPattern` function (pure string logic) lives in `src/lib/`.
Each updater in `src/updaters/` uses it for config file edits and calls typed Rust commands for
reload operations. The Shell plugin is removed — all OS operations go through Rust.

**Tech Stack:** TypeScript (Deno), Rust (Tauri v2), TanStack Query, Tauri FS plugin

---

## File Structure

| File | Responsibility |
|-|-|
| `src/lib/replace-config-pattern.ts` | Generic regex-based config pattern replacer |
| `src/lib/replace-config-pattern_test.ts` | Tests for all patterns (ghostty, nvim, custom) |
| `src/updaters/defaults.ts` | Default match_pattern + replace_template per app |
| `src/updaters/ghostty.ts` | Ghostty updater (refactored) |
| `src/updaters/nvim.ts` | Nvim updater (new) |
| `src/updaters/registry.ts` | AppName → updater map (add nvim) |
| `src/types/apps.ts` | Add optional match_pattern, replace_template |
| `src-tauri/src/updaters/mod.rs` | Rust updaters module |
| `src-tauri/src/updaters/ghostty.rs` | reload_ghostty Rust command |
| `src-tauri/src/updaters/nvim.rs` | reload_nvim Rust command |
| `src-tauri/src/lib.rs` | Register new commands, remove shell plugin |
| `src-tauri/Cargo.toml` | Remove tauri-plugin-shell |
| `src-tauri/capabilities/default.json` | Remove shell:allow-execute |
| `deno.json` | Remove @tauri-apps/plugin-shell |

**Removed:** `src/updaters/ghostty_test.ts` (tests move to `replace-config-pattern_test.ts`)

---

## Chunk 1: Generic Pattern Replacer + Tests

### Task 1: Create replaceConfigPattern with TDD

**Files:**
- Create: `src/lib/replace-config-pattern.ts`
- Create: `src/lib/replace-config-pattern_test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/replace-config-pattern_test.ts`:

```typescript
import { assertEquals, assertThrows } from "@std/assert";
import { replaceConfigPattern } from "./replace-config-pattern.ts";

// --- Ghostty patterns ---

Deno.test("replaceConfigPattern replaces ghostty theme line", () => {
    const input = [
        "# Colors",
        "theme = black-atom-jpn-koyo-hiru.conf",
        "bold-is-bright = false",
    ].join("\n");

    const result = replaceConfigPattern(
        input,
        "^theme\\s*=\\s*.+$",
        "theme = {themeKey}.conf",
        "black-atom-default-dark",
    );

    assertEquals(
        result,
        ["# Colors", "theme = black-atom-default-dark.conf", "bold-is-bright = false"].join("\n"),
    );
});

Deno.test("replaceConfigPattern handles ghostty theme line with spaces", () => {
    const input = "theme =   old-theme.conf\nother = value";
    const result = replaceConfigPattern(input, "^theme\\s*=\\s*.+$", "theme = {themeKey}.conf", "new-theme");
    assertEquals(result, "theme = new-theme.conf\nother = value");
});

Deno.test("replaceConfigPattern throws if pattern not found", () => {
    const input = "# No theme line here\nbold-is-bright = false";
    assertThrows(
        () => replaceConfigPattern(input, "^theme\\s*=\\s*.+$", "theme = {themeKey}.conf", "any"),
        Error,
        "Pattern not found",
    );
});

Deno.test("replaceConfigPattern preserves rest of file", () => {
    const input = ["# Comment", "theme = old.conf", "", "font-size = 14"].join("\n");
    const result = replaceConfigPattern(input, "^theme\\s*=\\s*.+$", "theme = {themeKey}.conf", "new");
    const lines = result.split("\n");
    assertEquals(lines[0], "# Comment");
    assertEquals(lines[1], "theme = new.conf");
    assertEquals(lines[2], "");
    assertEquals(lines[3], "font-size = 14");
});

// --- Nvim patterns ---

Deno.test("replaceConfigPattern replaces nvim colorscheme", () => {
    const input = [
        "return {",
        '    colorscheme = "black-atom-terra-fall-night",',
        "    debug = false,",
        "}",
    ].join("\n");

    const result = replaceConfigPattern(
        input,
        'colorscheme\\s*=\\s*"[^"]*"',
        'colorscheme = "{themeKey}"',
        "black-atom-jpn-koyo-hiru",
    );

    assertEquals(
        result,
        ["return {", '    colorscheme = "black-atom-jpn-koyo-hiru",', "    debug = false,", "}"].join("\n"),
    );
});

Deno.test("replaceConfigPattern handles nvim colorscheme with spaces", () => {
    const input = '    colorscheme  =  "old-theme",';
    const result = replaceConfigPattern(
        input,
        'colorscheme\\s*=\\s*"[^"]*"',
        'colorscheme = "{themeKey}"',
        "new-theme",
    );
    assertEquals(result, '    colorscheme = "new-theme",');
});

// --- Generic behavior ---

Deno.test("replaceConfigPattern only replaces first match", () => {
    const input = "theme = a.conf\ntheme = b.conf";
    const result = replaceConfigPattern(input, "^theme\\s*=\\s*.+$", "theme = {themeKey}.conf", "new");
    assertEquals(result, "theme = new.conf\ntheme = b.conf");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `deno test --allow-env --allow-read --allow-write src/lib/replace-config-pattern_test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement replaceConfigPattern**

Create `src/lib/replace-config-pattern.ts`:

```typescript
/**
 * Replace the first match of a regex pattern in content with a rendered template.
 * The template supports {themeKey} placeholder.
 * Throws if the pattern is not found in the content.
 */
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

    return content.replace(regex, rendered);
}
```

- [ ] **Step 4: Run tests**

Run: `deno test --allow-env --allow-read --allow-write src/lib/replace-config-pattern_test.ts`
Expected: All 7 tests PASS

- [ ] **Step 5: Format and commit**

```bash
deno fmt src/lib/replace-config-pattern.ts src/lib/replace-config-pattern_test.ts
git add src/lib/replace-config-pattern.ts src/lib/replace-config-pattern_test.ts
git commit -m "feat: add generic replaceConfigPattern with tests [DEV-286]"
```

---

### Task 2: Create updater defaults

**Files:**
- Create: `src/updaters/defaults.ts`

- [ ] **Step 1: Create defaults file**

Create `src/updaters/defaults.ts`:

```typescript
import type { AppName } from "../types/apps.ts";

export interface AppPatternDefaults {
    matchPattern: string;
    replaceTemplate: string;
}

export const APP_PATTERN_DEFAULTS: Partial<Record<AppName, AppPatternDefaults>> = {
    ghostty: {
        matchPattern: "^theme\\s*=\\s*.+$",
        replaceTemplate: "theme = {themeKey}.conf",
    },
    nvim: {
        matchPattern: 'colorscheme\\s*=\\s*"[^"]*"',
        replaceTemplate: 'colorscheme = "{themeKey}"',
    },
};
```

- [ ] **Step 2: Verify types**

Run: `deno task check`
Expected: Clean

- [ ] **Step 3: Commit**

```bash
git add src/updaters/defaults.ts
git commit -m "feat: add default match/replace patterns per app [DEV-286]"
```

---

### Task 3: Add match_pattern and replace_template to AppConfig

**Files:**
- Modify: `src/types/apps.ts`
- Modify: `src-tauri/src/config.rs`

- [ ] **Step 1: Update TypeScript type**

Replace `src/types/apps.ts`:

```typescript
export type AppName = "nvim" | "tmux" | "ghostty" | "zed" | "delta";

export interface AppConfig {
    enabled: boolean;
    config_path: string;
    themes_path?: string;
    match_pattern?: string;
    replace_template?: string;
}
```

- [ ] **Step 2: Update Rust struct**

In `src-tauri/src/config.rs`, add to the `AppConfig` struct after `themes_path`:

```rust
    #[serde(skip_serializing_if = "Option::is_none")]
    pub match_pattern: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub replace_template: Option<String>,
```

- [ ] **Step 3: Verify**

Run: `deno task check && cd src-tauri && cargo check`
Expected: Both clean

- [ ] **Step 4: Commit**

```bash
git add src/types/apps.ts src-tauri/src/config.rs
git commit -m "feat: add optional match_pattern and replace_template to AppConfig [DEV-286]"
```

---

## Chunk 2: Rust Reload Commands + Remove Shell Plugin

### Task 4: Create Rust updaters module with ghostty reload

**Files:**
- Create: `src-tauri/src/updaters/mod.rs`
- Create: `src-tauri/src/updaters/ghostty.rs`

- [ ] **Step 1: Create directory and mod.rs**

```bash
mkdir -p src-tauri/src/updaters
```

Create `src-tauri/src/updaters/mod.rs`:

```rust
pub mod ghostty;
pub mod nvim;
```

- [ ] **Step 2: Create ghostty.rs**

Create `src-tauri/src/updaters/ghostty.rs`:

```rust
/// Reload ghostty by sending SIGUSR2.
/// Returns Ok even if ghostty isn't running — the config file is already updated.
#[tauri::command]
pub fn reload_ghostty() -> Result<(), String> {
    match std::process::Command::new("pkill")
        .args(["-SIGUSR2", "ghostty"])
        .output()
    {
        Ok(output) => {
            if !output.status.success() {
                log::info!("pkill returned non-zero (ghostty may not be running)");
            }
            Ok(())
        }
        Err(e) => {
            log::warn!("Failed to run pkill: {e}");
            Ok(()) // Not an error — ghostty just isn't running
        }
    }
}
```

- [ ] **Step 3: Create nvim placeholder and verify Rust compiles**

Create `src-tauri/src/updaters/nvim.rs` (placeholder — implemented in Task 5):

```rust
// Implemented in Task 5
```

Run: `cd src-tauri && cargo check`
Expected: Clean

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/updaters/
git commit -m "feat: add Rust ghostty reload command [DEV-286]"
```

---

### Task 5: Create Rust nvim reload command

**Files:**
- Modify: `src-tauri/src/updaters/nvim.rs`

- [ ] **Step 1: Implement nvim reload**

Replace `src-tauri/src/updaters/nvim.rs`:

```rust
use std::path::Path;

/// Reload all running Neovim instances by sending :colorscheme via server sockets.
/// Neovim auto-creates sockets at $TMPDIR/nvim.<user>/*/nvim.*.0
/// Non-zero exit from nvim --server is fine — means that socket is stale.
#[tauri::command]
pub fn reload_nvim(theme_key: String) -> Result<(), String> {
    let tmpdir = std::env::var("TMPDIR").unwrap_or_else(|_| "/tmp".to_string());
    let tmpdir_path = Path::new(&tmpdir);

    let Ok(entries) = std::fs::read_dir(tmpdir_path) else {
        log::info!("Could not read tmpdir for nvim sockets");
        return Ok(());
    };

    for entry in entries.flatten() {
        let dir_name = entry.file_name();
        let dir_name_str = dir_name.to_string_lossy();

        // Look for nvim.* directories
        if !dir_name_str.starts_with("nvim.") {
            continue;
        }

        // Walk subdirectories to find socket files
        let nvim_dir = entry.path();
        if let Ok(sub_entries) = std::fs::read_dir(&nvim_dir) {
            for sub_entry in sub_entries.flatten() {
                let sub_path = sub_entry.path();
                if let Ok(sub_files) = std::fs::read_dir(&sub_path) {
                    for socket_entry in sub_files.flatten() {
                        let socket_path = socket_entry.path();
                        let socket_name = socket_path.file_name()
                            .map(|n| n.to_string_lossy().to_string())
                            .unwrap_or_default();

                        if socket_name.starts_with("nvim.") {
                            let cmd = format!(":colorscheme {}<CR>", theme_key);
                            let result = std::process::Command::new("nvim")
                                .args([
                                    "--server",
                                    &socket_path.to_string_lossy(),
                                    "--remote-send",
                                    &cmd,
                                ])
                                .output();

                            match result {
                                Ok(output) if !output.status.success() => {
                                    log::info!(
                                        "nvim --server {} returned non-zero (stale socket)",
                                        socket_path.display()
                                    );
                                }
                                Err(e) => {
                                    log::warn!("Failed to send to nvim socket: {e}");
                                }
                                _ => {
                                    log::info!(
                                        "Sent colorscheme {} to {}",
                                        theme_key,
                                        socket_path.display()
                                    );
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(())
}
```

- [ ] **Step 2: Verify Rust compiles**

Run: `cd src-tauri && cargo check`
Expected: Clean

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/updaters/nvim.rs
git commit -m "feat: add Rust nvim reload command via server sockets [DEV-286]"
```

---

### Task 6: Register Rust commands, remove Shell plugin

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/capabilities/default.json`
- Modify: `deno.json`

- [ ] **Step 1: Update lib.rs**

Replace `src-tauri/src/lib.rs`:

```rust
mod config;
mod updaters;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            config::get_config,
            config::save_config,
            updaters::ghostty::reload_ghostty,
            updaters::nvim::reload_nvim,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 2: Remove tauri-plugin-shell from Cargo.toml**

Remove this line from `src-tauri/Cargo.toml`:
```
tauri-plugin-shell = "2"
```

- [ ] **Step 3: Remove shell permissions from capabilities**

Replace `src-tauri/capabilities/default.json`:

```json
{
    "$schema": "../gen/schemas/desktop-schema.json",
    "identifier": "default",
    "description": "enables the default permissions",
    "windows": [
        "main"
    ],
    "permissions": [
        "core:default",
        "fs:default",
        "fs:allow-read-text-file",
        "fs:allow-write-text-file",
        {
            "identifier": "fs:scope",
            "allow": [
                { "path": "$HOME/.config/black-atom/livery/*" }
            ]
        }
    ]
}
```

- [ ] **Step 4: Remove @tauri-apps/plugin-shell from deno.json**

Remove this line from `deno.json` imports:
```
"@tauri-apps/plugin-shell": "npm:@tauri-apps/plugin-shell@^2"
```

- [ ] **Step 5: Verify**

Run: `cd src-tauri && cargo check`
Expected: Clean (may have warnings about unused imports in ghostty.ts — fixed in next task)

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/lib.rs src-tauri/Cargo.toml src-tauri/capabilities/default.json deno.json
git commit -m "feat: register Rust reload commands, remove Shell plugin [DEV-286]"
```

---

## Chunk 3: Refactor Ghostty + Implement Nvim Updater

### Task 7: Refactor ghostty updater to use replaceConfigPattern + Rust reload

**Files:**
- Modify: `src/updaters/ghostty.ts`
- Delete: `src/updaters/ghostty_test.ts`

- [ ] **Step 1: Rewrite ghostty.ts**

Replace `src/updaters/ghostty.ts`:

```typescript
import type { ThemeKey } from "@black-atom/core";
import { invoke } from "@tauri-apps/api/core";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { AppConfig } from "../types/apps.ts";
import type { UpdateResult } from "../types/updaters.ts";
import { replaceConfigPattern } from "../lib/replace-config-pattern.ts";
import { APP_PATTERN_DEFAULTS } from "./defaults.ts";

const DEFAULTS = APP_PATTERN_DEFAULTS.ghostty!;

export async function runGhosttyUpdater(
    themeKey: ThemeKey,
    appConfig: AppConfig,
): Promise<UpdateResult> {
    const matchPattern = appConfig.match_pattern ?? DEFAULTS.matchPattern;
    const replaceTemplate = appConfig.replace_template ?? DEFAULTS.replaceTemplate;

    try {
        const content = await readTextFile(appConfig.config_path);
        const updated = replaceConfigPattern(content, matchPattern, replaceTemplate, themeKey);
        await writeTextFile(appConfig.config_path, updated);

        await invoke("reload_ghostty");

        return { app: "ghostty", status: "done" };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[ghostty updater]", error);
        return { app: "ghostty", status: "error", message };
    }
}
```

- [ ] **Step 2: Delete old test file**

```bash
rm src/updaters/ghostty_test.ts
```

The ghostty pattern tests now live in `src/lib/replace-config-pattern_test.ts`.

- [ ] **Step 3: Verify**

Run: `deno task check && deno task test`
Expected: All tests pass (ghostty_test.ts removed, replace-config-pattern_test.ts covers it)

- [ ] **Step 4: Commit**

```bash
git add src/updaters/ghostty.ts
git rm src/updaters/ghostty_test.ts
git commit -m "refactor: ghostty updater uses replaceConfigPattern + Rust reload [DEV-286]"
```

---

### Task 8: Implement nvim updater

**Files:**
- Create: `src/updaters/nvim.ts`

- [ ] **Step 1: Create nvim.ts**

Create `src/updaters/nvim.ts`:

```typescript
import type { ThemeKey } from "@black-atom/core";
import { invoke } from "@tauri-apps/api/core";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { AppConfig } from "../types/apps.ts";
import type { UpdateResult } from "../types/updaters.ts";
import { replaceConfigPattern } from "../lib/replace-config-pattern.ts";
import { APP_PATTERN_DEFAULTS } from "./defaults.ts";

const DEFAULTS = APP_PATTERN_DEFAULTS.nvim!;

export async function runNvimUpdater(
    themeKey: ThemeKey,
    appConfig: AppConfig,
): Promise<UpdateResult> {
    const matchPattern = appConfig.match_pattern ?? DEFAULTS.matchPattern;
    const replaceTemplate = appConfig.replace_template ?? DEFAULTS.replaceTemplate;

    try {
        // Persist: update config file
        const content = await readTextFile(appConfig.config_path);
        const updated = replaceConfigPattern(content, matchPattern, replaceTemplate, themeKey);
        await writeTextFile(appConfig.config_path, updated);

        // Live reload: send :colorscheme to all running nvim instances
        await invoke("reload_nvim", { themeKey });

        return { app: "nvim", status: "done" };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[nvim updater]", error);
        return { app: "nvim", status: "error", message };
    }
}
```

- [ ] **Step 2: Register in updater registry**

Replace `src/updaters/registry.ts`:

```typescript
import type { ThemeKey } from "@black-atom/core";
import type { AppConfig, AppName } from "../types/apps.ts";
import type { UpdateResult } from "../types/updaters.ts";
import { runGhosttyUpdater } from "./ghostty.ts";
import { runNvimUpdater } from "./nvim.ts";

export type AppUpdater = (themeKey: ThemeKey, appConfig: AppConfig) => Promise<UpdateResult>;

/** Available updaters. Apps without an entry here are skipped during theme application. */
export const updaterRegistry: Partial<Record<AppName, AppUpdater>> = {
    ghostty: runGhosttyUpdater,
    nvim: runNvimUpdater,
};
```

- [ ] **Step 3: Verify**

Run: `deno task check && deno task test`
Expected: All tests pass, types clean

- [ ] **Step 4: Commit**

```bash
git add src/updaters/nvim.ts src/updaters/registry.ts
git commit -m "feat: add nvim updater with config persistence + live reload [DEV-286]"
```

---

### Task 9: Final verification

**No files changed — verification only.**

- [ ] **Step 1: Full check suite**

```bash
deno task check && deno task lint && deno task test
```

Expected: All pass

- [ ] **Step 2: Rust compiles**

```bash
cd src-tauri && cargo check
```

Expected: Clean

- [ ] **Step 3: Manual E2E — ghostty regression**

1. Run `deno task dev`, pick a theme
2. Verify ghostty config updated, terminal repaints
3. Check console for errors — should use `invoke("reload_ghostty")` not shell command

- [ ] **Step 4: Manual E2E — nvim**

1. Add nvim to config: `"nvim": { "enabled": true, "config_path": "~/.config/nvim/lua/config.lua" }`
2. Restart app, pick a theme
3. Verify `~/.config/nvim/lua/config.lua` has updated `colorscheme = "..."` line
4. Verify all running nvim instances switched theme live
5. Restart nvim — verify persisted theme loads correctly
