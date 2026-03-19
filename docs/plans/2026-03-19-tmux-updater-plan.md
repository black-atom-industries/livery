# Tmux Updater Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents
> available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`)
> syntax for tracking.

**Goal:** Implement the tmux updater — replace the theme source-file line in tmux.conf and reload.
Also widen the updater system to pass `collectionKey` via an `UpdaterContext` object.

**Architecture:** Extend `replaceConfigPattern` with `{collectionKey}` and `{themesPath}` placeholders.
Refactor `AppUpdater` to take an `UpdaterContext` instead of positional args. Add tmux defaults,
Rust reload command, and the tmux updater module.

**Tech Stack:** TypeScript (Deno), Rust (Tauri v2), TanStack Query, Tauri FS plugin

---

## File Structure

| File | Change | Responsibility |
|-|-|-|
| `src/lib/replace-config-pattern.ts` | Modify | Add `collectionKey?` and `themesPath?` to args |
| `src/lib/replace-config-pattern_test.ts` | Modify | Add tmux pattern tests |
| `src/updaters/registry.ts` | Modify | New `UpdaterContext` type, update signature |
| `src/updaters/defaults.ts` | Modify | Add tmux defaults |
| `src/updaters/ghostty.ts` | Modify | Take `UpdaterContext` instead of positional args |
| `src/updaters/nvim.ts` | Modify | Take `UpdaterContext` instead of positional args |
| `src/updaters/tmux.ts` | Create | Tmux updater |
| `src/lib/apply-theme.ts` | Modify | Pass `collectionKey` through to updaters |
| `src/routes/index.tsx` | Modify | Pass `collectionKey` to `getEnabledUpdaters` |
| `src-tauri/src/updaters/mod.rs` | Modify | Add tmux module |
| `src-tauri/src/updaters/tmux.rs` | Create | `reload_tmux` command |
| `src-tauri/src/lib.rs` | Modify | Register `reload_tmux` |

---

## Chunk 1: Widen Pattern System + UpdaterContext

### Task 1: Add placeholders to replaceConfigPattern (TDD)

**Files:**
- Modify: `src/lib/replace-config-pattern.ts`
- Modify: `src/lib/replace-config-pattern_test.ts`

- [ ] **Step 1: Add tmux test to test file**

Add to `src/lib/replace-config-pattern_test.ts`:

```typescript
// --- Tmux patterns ---

Deno.test("replaceConfigPattern replaces tmux source-file line", () => {
    const input = [
        'bind r source-file ~/.config/tmux/tmux.conf \\; display "reloaded!"',
        "source-file ~/repos/black-atom-industries/tmux/themes/terra/black-atom-terra-fall-night.conf",
        "source-file ~/.config/tmux/keymaps.conf",
    ].join("\n");

    const result = replaceConfigPattern({
        content: input,
        matchPattern: "^source-file\\s+.+/themes/.+\\.conf$",
        replaceTemplate: "source-file {themesPath}/{collectionKey}/{themeKey}.conf",
        themeKey: "black-atom-jpn-koyo-hiru",
        collectionKey: "jpn",
        themesPath: "~/repos/black-atom-industries/tmux/themes",
    });

    assertEquals(
        result,
        [
            'bind r source-file ~/.config/tmux/tmux.conf \\; display "reloaded!"',
            "source-file ~/repos/black-atom-industries/tmux/themes/jpn/black-atom-jpn-koyo-hiru.conf",
            "source-file ~/.config/tmux/keymaps.conf",
        ].join("\n"),
    );
});

Deno.test("replaceConfigPattern handles tmux theme without collection placeholder", () => {
    const input = "source-file ~/themes/terra/old-theme.conf";
    const result = replaceConfigPattern({
        content: input,
        matchPattern: "^source-file\\s+.+/themes/.+\\.conf$",
        replaceTemplate: "source-file {themesPath}/{collectionKey}/{themeKey}.conf",
        themeKey: "new-theme",
        collectionKey: "default",
        themesPath: "~/themes",
    });
    assertEquals(result, "source-file ~/themes/default/new-theme.conf");
});
```

- [ ] **Step 2: Run tests — expect fail**

Run: `deno test --allow-env --allow-read --allow-write src/lib/replace-config-pattern_test.ts`
Expected: FAIL — `collectionKey` not in `ReplaceConfigPatternArgs`

- [ ] **Step 3: Update replaceConfigPattern**

Replace `src/lib/replace-config-pattern.ts`:

```typescript
export interface ReplaceConfigPatternArgs {
    content: string;
    matchPattern: string;
    replaceTemplate: string;
    themeKey: string;
    collectionKey?: string;
    themesPath?: string;
}

/**
 * Replace the first match of a regex pattern in content with a rendered template.
 * Supports placeholders: {themeKey}, {collectionKey}, {themesPath}.
 * Throws if the pattern is not found or {themeKey} is missing from template.
 */
export function replaceConfigPattern(args: ReplaceConfigPatternArgs): string {
    const { content, matchPattern, replaceTemplate, themeKey, collectionKey, themesPath } = args;

    if (!replaceTemplate.includes("{themeKey}")) {
        throw new Error("replace_template must contain {themeKey} placeholder");
    }

    const regex = new RegExp(matchPattern, "m");
    const rendered = replaceTemplate
        .replace("{themeKey}", themeKey)
        .replace("{collectionKey}", collectionKey ?? "")
        .replace("{themesPath}", themesPath ?? "");

    if (!regex.test(content)) {
        throw new Error(`Pattern not found: ${matchPattern}`);
    }

    return content.replace(regex, rendered);
}
```

- [ ] **Step 4: Run tests**

Run: `deno test --allow-env --allow-read --allow-write src/lib/replace-config-pattern_test.ts`
Expected: All 10 tests PASS

- [ ] **Step 5: Commit**

```bash
deno fmt src/lib/replace-config-pattern.ts src/lib/replace-config-pattern_test.ts
git add src/lib/replace-config-pattern.ts src/lib/replace-config-pattern_test.ts
git commit -m "feat: add collectionKey and themesPath placeholders to replaceConfigPattern [DEV-287]"
```

---

### Task 2: Refactor AppUpdater to use UpdaterContext

**Files:**
- Modify: `src/updaters/registry.ts`
- Modify: `src/updaters/ghostty.ts`
- Modify: `src/updaters/nvim.ts`
- Modify: `src/lib/apply-theme.ts`
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Update registry with UpdaterContext**

Replace `src/updaters/registry.ts`:

```typescript
import type { ThemeCollectionKey, ThemeKey } from "@black-atom/core";
import type { AppConfig, AppName } from "../types/apps.ts";
import type { UpdateResult } from "../types/updaters.ts";
import { runGhosttyUpdater } from "./ghostty.ts";
import { runNvimUpdater } from "./nvim.ts";

export interface UpdaterContext {
    themeKey: ThemeKey;
    collectionKey: ThemeCollectionKey;
    appConfig: AppConfig;
}

export type AppUpdater = (ctx: UpdaterContext) => Promise<UpdateResult>;

/** Available updaters. Apps without an entry here are skipped during theme application. */
export const updaterRegistry: Partial<Record<AppName, AppUpdater>> = {
    ghostty: runGhosttyUpdater,
    nvim: runNvimUpdater,
};
```

- [ ] **Step 2: Update ghostty updater**

Replace `src/updaters/ghostty.ts`:

```typescript
import { invoke } from "@tauri-apps/api/core";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { UpdateResult } from "../types/updaters.ts";
import { replaceConfigPattern } from "../lib/replace-config-pattern.ts";
import { APP_PATTERN_DEFAULTS } from "./defaults.ts";
import type { UpdaterContext } from "./registry.ts";

export async function runGhosttyUpdater(ctx: UpdaterContext): Promise<UpdateResult> {
    const { themeKey, appConfig } = ctx;
    const defaults = APP_PATTERN_DEFAULTS.ghostty;
    const matchPattern = appConfig.match_pattern ?? defaults?.matchPattern;
    const replaceTemplate = appConfig.replace_template ?? defaults?.replaceTemplate;

    if (!matchPattern || !replaceTemplate) {
        return { app: "ghostty", status: "error", message: "No pattern defaults for ghostty" };
    }

    try {
        const content = await readTextFile(appConfig.config_path);
        const updated = replaceConfigPattern({ content, matchPattern, replaceTemplate, themeKey });
        await writeTextFile(appConfig.config_path, updated);

        await invoke("reload_ghostty");

        return { app: "ghostty", status: "done" };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("[ghostty updater]", error);
        return { app: "ghostty", status: "error", message };
    }
}
```

- [ ] **Step 3: Update nvim updater**

Replace `src/updaters/nvim.ts`:

```typescript
import { invoke } from "@tauri-apps/api/core";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { UpdateResult } from "../types/updaters.ts";
import { replaceConfigPattern } from "../lib/replace-config-pattern.ts";
import { APP_PATTERN_DEFAULTS } from "./defaults.ts";
import type { UpdaterContext } from "./registry.ts";

export async function runNvimUpdater(ctx: UpdaterContext): Promise<UpdateResult> {
    const { themeKey, appConfig } = ctx;
    const defaults = APP_PATTERN_DEFAULTS.nvim;
    const matchPattern = appConfig.match_pattern ?? defaults?.matchPattern;
    const replaceTemplate = appConfig.replace_template ?? defaults?.replaceTemplate;

    if (!matchPattern || !replaceTemplate) {
        return { app: "nvim", status: "error", message: "No pattern defaults for nvim" };
    }

    try {
        const content = await readTextFile(appConfig.config_path);
        const updated = replaceConfigPattern({ content, matchPattern, replaceTemplate, themeKey });
        await writeTextFile(appConfig.config_path, updated);

        await invoke("reload_nvim", { themeKey });

        return { app: "nvim", status: "done" };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("[nvim updater]", error);
        return { app: "nvim", status: "error", message };
    }
}
```

- [ ] **Step 4: Update apply-theme.ts to pass collectionKey**

Replace `src/lib/apply-theme.ts`:

```typescript
import type { ThemeCollectionKey, ThemeKey } from "@black-atom/core";
import type { AppConfig, AppName } from "../types/apps.ts";
import type { UpdateResult } from "../types/updaters.ts";
import { updaterRegistry } from "../updaters/registry.ts";

export interface UpdaterEntry {
    app: AppName;
    run: () => Promise<UpdateResult>;
}

/** Build the list of updaters for enabled apps that have a registered updater. */
export function getEnabledUpdaters(
    themeKey: ThemeKey,
    collectionKey: ThemeCollectionKey,
    apps: Partial<Record<AppName, AppConfig>>,
): UpdaterEntry[] {
    return (Object.entries(apps) as [AppName, AppConfig][])
        .filter(([name, app]) => app.enabled && updaterRegistry[name])
        .map(([name, appConfig]) => ({
            app: name,
            run: () => updaterRegistry[name]!({ themeKey, collectionKey, appConfig }),
        }));
}

/** Run updaters sequentially, calling onUpdate after each status change. */
export async function applyTheme(
    updaters: UpdaterEntry[],
    onUpdate: (results: UpdateResult[]) => void,
): Promise<void> {
    const results: UpdateResult[] = updaters.map<UpdateResult>((u) => ({
        app: u.app,
        status: "pending",
    }));

    onUpdate(results);

    for (let i = 0; i < updaters.length; i++) {
        results[i] = { app: updaters[i].app, status: "running" };
        onUpdate([...results]);

        results[i] = await updaters[i].run();
        onUpdate([...results]);
    }
}
```

- [ ] **Step 5: Update route to pass collectionKey**

In `src/routes/index.tsx`, change the `handleApplyTheme` function:

```typescript
// Before:
const updaters = getEnabledUpdaters(theme.meta.key, config.query.data.apps);

// After:
const updaters = getEnabledUpdaters(
    theme.meta.key,
    theme.meta.collection.key,
    config.query.data.apps,
);
```

- [ ] **Step 6: Verify**

Run: `deno task check && deno task test`
Expected: All tests pass, types clean

- [ ] **Step 7: Commit**

```bash
deno fmt src/updaters/registry.ts src/updaters/ghostty.ts src/updaters/nvim.ts src/lib/apply-theme.ts src/routes/index.tsx
git add src/updaters/registry.ts src/updaters/ghostty.ts src/updaters/nvim.ts src/lib/apply-theme.ts src/routes/index.tsx
git commit -m "refactor: widen AppUpdater to UpdaterContext with collectionKey [DEV-287]"
```

---

## Chunk 2: Tmux Updater + Rust Reload

### Task 3: Add tmux defaults

**Files:**
- Modify: `src/updaters/defaults.ts`

- [ ] **Step 1: Add tmux entry**

Add to `APP_PATTERN_DEFAULTS` in `src/updaters/defaults.ts`:

```typescript
    tmux: {
        matchPattern: "^source-file\\s+.+/themes/.+\\.conf$",
        replaceTemplate: "source-file {themesPath}/{collectionKey}/{themeKey}.conf",
    },
```

- [ ] **Step 2: Verify**

Run: `deno task check`
Expected: Clean

- [ ] **Step 3: Commit**

```bash
git add src/updaters/defaults.ts
git commit -m "feat: add tmux pattern defaults [DEV-287]"
```

---

### Task 4: Create Rust tmux reload command

**Files:**
- Create: `src-tauri/src/updaters/tmux.rs`
- Modify: `src-tauri/src/updaters/mod.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create tmux.rs**

Create `src-tauri/src/updaters/tmux.rs`:

```rust
/// Reload tmux by sourcing the config file.
/// Returns Ok even if tmux isn't running.
#[tauri::command]
pub fn reload_tmux(config_path: String) -> Result<(), String> {
    match std::process::Command::new("tmux")
        .args(["source-file", &config_path])
        .output()
    {
        Ok(output) => {
            if !output.status.success() {
                log::info!("tmux source-file returned non-zero (tmux may not be running)");
            }
            Ok(())
        }
        Err(e) => {
            log::warn!("Failed to run tmux: {e}");
            Ok(())
        }
    }
}
```

- [ ] **Step 2: Add to mod.rs**

In `src-tauri/src/updaters/mod.rs`, add:

```rust
pub mod tmux;
```

- [ ] **Step 3: Register in lib.rs**

Add to the `generate_handler!` macro in `src-tauri/src/lib.rs`:

```rust
updaters::tmux::reload_tmux,
```

- [ ] **Step 4: Verify Rust compiles**

Run: `cd src-tauri && cargo check`
Expected: Clean

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/updaters/tmux.rs src-tauri/src/updaters/mod.rs src-tauri/src/lib.rs
git commit -m "feat: add Rust tmux reload command [DEV-287]"
```

---

### Task 5: Implement tmux updater + register

**Files:**
- Create: `src/updaters/tmux.ts`
- Modify: `src/updaters/registry.ts`

- [ ] **Step 1: Create tmux.ts**

Create `src/updaters/tmux.ts`:

```typescript
import { invoke } from "@tauri-apps/api/core";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { UpdateResult } from "../types/updaters.ts";
import { replaceConfigPattern } from "../lib/replace-config-pattern.ts";
import { APP_PATTERN_DEFAULTS } from "./defaults.ts";
import type { UpdaterContext } from "./registry.ts";

export async function runTmuxUpdater(ctx: UpdaterContext): Promise<UpdateResult> {
    const { themeKey, collectionKey, appConfig } = ctx;
    const defaults = APP_PATTERN_DEFAULTS.tmux;
    const matchPattern = appConfig.match_pattern ?? defaults?.matchPattern;
    const replaceTemplate = appConfig.replace_template ?? defaults?.replaceTemplate;

    if (!matchPattern || !replaceTemplate) {
        return { app: "tmux", status: "error", message: "No pattern defaults for tmux" };
    }

    try {
        const content = await readTextFile(appConfig.config_path);
        const updated = replaceConfigPattern({
            content,
            matchPattern,
            replaceTemplate,
            themeKey,
            collectionKey,
            themesPath: appConfig.themes_path,
        });
        await writeTextFile(appConfig.config_path, updated);

        await invoke("reload_tmux", { configPath: appConfig.config_path });

        return { app: "tmux", status: "done" };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("[tmux updater]", error);
        return { app: "tmux", status: "error", message };
    }
}
```

- [ ] **Step 2: Register in updater registry**

Add import and entry in `src/updaters/registry.ts`:

```typescript
import { runTmuxUpdater } from "./tmux.ts";

// In updaterRegistry:
    tmux: runTmuxUpdater,
```

- [ ] **Step 3: Verify**

Run: `deno task check && deno task test`
Expected: All tests pass, types clean

- [ ] **Step 4: Commit**

```bash
deno fmt src/updaters/tmux.ts src/updaters/registry.ts
git add src/updaters/tmux.ts src/updaters/registry.ts
git commit -m "feat: add tmux updater with config persistence + reload [DEV-287]"
```

---

### Task 6: Final verification

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

- [ ] **Step 3: Manual E2E — tmux**

1. Add tmux to config:
```json
"tmux": {
    "enabled": true,
    "config_path": "~/.config/tmux/tmux.conf",
    "themes_path": "~/repos/black-atom-industries/tmux/themes"
}
```

2. Restart app (`deno task dev`), pick a theme
3. Verify: `~/.config/tmux/tmux.conf` has updated `source-file` line with correct collection/theme
4. Verify: tmux reloads with new theme
5. Verify: ghostty and nvim still work (regression)
