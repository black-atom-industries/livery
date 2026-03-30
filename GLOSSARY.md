# GLOSSARY

> **Shared terms** — Theme, Theme Key, Theme Definition, Appearance, Collection, Collection Key,
> Theme Meta, and all color groups (Primaries, Palette, UI Colors, Syntax Colors) are defined in
> [`@black-atom/core` UBIQUITOUS_LANGUAGE.md](https://github.com/black-atom-industries/core/blob/main/UBIQUITOUS_LANGUAGE.md).
> This glossary covers only livery-specific domain language.

## Theme Display

| Term           | Definition                                                                                                                        | Aliases to avoid  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| **ThemeGroup** | A frontend display structure that pairs a Collection Key with its sorted list of Theme Definitions — used to render the picker UI | Category, section |

## Configuration

| Term                 | Definition                                                                                                                                 | Aliases to avoid             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| **Config**           | The user's livery configuration file (`~/.config/black-atom/livery/config.json`) containing a SystemAppearance toggle and per-app settings | Settings, preferences        |
| **AppConfig**        | The per-app configuration block — enabled flag, config_path, themes_path, match_pattern, and replace_template                              | App settings, app entry      |
| **AppName**          | An enum of supported applications that livery can update (nvim, tmux, ghostty, zed, delta, lazygit, obsidian)                              | App, tool, target            |
| **ConfigPath**       | The filesystem path to an app's configuration file that livery will patch                                                                  | Target file, output path     |
| **ThemesPath**       | An optional directory path where an app stores its theme files — used as a template variable, not expanded by Rust                         | Theme directory              |
| **MatchPattern**     | A regex pattern that locates the theme-setting line in an app's config file                                                                | Search pattern, find pattern |
| **ReplaceTemplate**  | A string template with `{variable}` placeholders that produces the new theme-setting line                                                  | Template, replacement string |
| **SystemAppearance** | The OS-level dark/light mode toggle — a standalone boolean in Config, not an app with AppConfig                                            | Dark mode, system theme      |

## Updater Pipeline

| Term              | Definition                                                                                                                                 | Aliases to avoid            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| **Updater**       | A per-app Rust module that knows how to patch a specific app's config file and optionally reload it                                        | Handler, writer, applier    |
| **Dispatcher**    | The routing logic in `updaters/mod.rs` that maps an AppName to its Updater                                                                 | Router, switch, handler     |
| **ThemeContext**  | The theme metadata struct passed from the frontend to the backend `update_app` command — a livery-specific projection of core's Theme Meta | Theme payload, theme params |
| **UpdateContext** | The backend-internal struct that combines ThemeContext fields with the app's ThemesPath for use in template rendering                      | Render context              |
| **UpdateResult**  | The outcome of a single Updater invocation — includes app name, status, optional message, and duration                                     | Result, response            |
| **UpdateStatus**  | The state of an Updater invocation — backend emits `done`, `error`, or `skipped`; frontend adds `pending` and `running`                    | State, outcome              |
| **UpdaterEntry**  | A frontend struct pairing an AppName with a runnable function that calls the backend                                                       | Task, job                   |

## File Operations

| Term                 | Definition                                                                                                                           | Aliases to avoid             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| **FileOp**           | One of three config-patching strategies: text (regex), YAML (lossless merge), or JSONC (CST edit)                                    | Write strategy, patch method |
| **patch_text_file**  | A FileOp that uses regex match-and-replace with template variable substitution                                                       | Text replace, regex patch    |
| **patch_yaml_file**  | A FileOp that performs lossless YAML merging while preserving comments                                                               | YAML update, YAML write      |
| **patch_jsonc_file** | A FileOp that edits JSONC via CST manipulation, preserving comments and formatting                                                   | JSON edit, JSONC update      |
| **TemplateVariable** | A `{name}` placeholder in a ReplaceTemplate — resolved from themeKey, appearance, collectionKey, or themesPath                       | Placeholder, token           |
| **AtomicWrite**      | The write strategy used by all FileOps — write to a temp file, then persist (rename) to the target path                              | Safe write                   |
| **Reload**           | The optional post-patch action that signals a running app to re-read its config (e.g., SIGUSR2 for ghostty, socket command for nvim) | Refresh, restart, notify     |

## UI Lifecycle

| Term           | Definition                                                                                                                                      | Aliases to avoid            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **Phase**      | The current UI state machine position — `"picking"` (user browsing themes), `"applying"` (updaters running), or `"done"` (all updates finished) | Step, stage, screen         |
| **ApplyTheme** | The frontend orchestration function that runs all UpdaterEntries sequentially, reporting progress via callbacks                                 | Run updaters, execute, sync |

## Relationships

- **Config** contains a map of **AppName** → **AppConfig** plus a **SystemAppearance** toggle
- An **AppConfig** has exactly one **MatchPattern** and one **ReplaceTemplate** (for text-based
  updaters)
- The **Dispatcher** routes an **AppName** to its **Updater**
- An **Updater** uses exactly one **FileOp** strategy and optionally performs a **Reload**
- **ApplyTheme** produces one **UpdateResult** per enabled **AppName**
- **ThemeContext** is a projection of core's **Theme Meta** — carries Theme Key, Appearance,
  Collection Key, and Theme Label across the IPC boundary

## Example dialogue

> **Dev:** "When a user selects a theme, what exactly happens?"
>
> **Domain expert:** "The **Phase** changes to `applying`. The frontend reads the **Config**,
> filters to enabled apps via **AppName**, and builds an **UpdaterEntry** for each one using the
> **Theme Meta** from the selected **Theme Definition**."
>
> **Dev:** "And each **UpdaterEntry** calls the backend separately?"
>
> **Domain expert:** "Yes — each one invokes `update_app` with the **AppName** and a
> **ThemeContext**. The **Dispatcher** maps the **AppName** to its **Updater**, which reads the
> **AppConfig**, picks the right **FileOp**, and patches the **ConfigPath**."
>
> **Dev:** "What about **SystemAppearance**? Is that a separate call?"
>
> **Domain expert:** "Correct — **SystemAppearance** is not an app with an **AppConfig**. It's a
> standalone toggle in **Config**. If enabled, the frontend fires a separate
> `update_system_appearance` call with just the **Appearance** string."
>
> **Dev:** "What if an app's **ConfigPath** doesn't exist?"
>
> **Domain expert:** "The **Updater** returns an **UpdateResult** with status `error`. It never
> creates files — it only patches existing ones."

## Flagged ambiguities

- **"app"** / **"AppName"**: in conversation, "app" sometimes means "a configured application that
  livery can update" and sometimes means "livery itself." Use **AppName** or "target app" when
  referring to tools livery manages. Use **Livery** when referring to the desktop application
  itself.
- **"config"** is used for both livery's own **Config** file and the target apps' configuration
  files (referenced by **ConfigPath**). Prefer **Config** for livery's configuration and
  **ConfigPath** or "app config file" for the files livery patches.
- **"context"** appears as both **ThemeContext** (frontend → backend IPC payload) and
  **UpdateContext** (backend-internal struct with resolved paths). These are distinct:
  **ThemeContext** crosses the IPC boundary, **UpdateContext** is enriched with per-app data for
  template rendering.
- **"template"** — core uses **Template** for Eta adapter templates; livery uses **ReplaceTemplate**
  for regex substitution strings. These are unrelated concepts. Always qualify: **ReplaceTemplate**
  in livery, **Adapter Template** in core.
