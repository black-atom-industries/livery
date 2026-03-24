# Design

## Updater Flow

Theme selection triggers updaters for each enabled app:

1. User picks a theme → frontend builds `UpdaterEntry[]` from enabled apps
2. Frontend calls `invoke("update_app", { app, themeKey, appearance, collectionKey })` per app
3. Backend dispatcher reads app config, patches config files, and reloads if needed
4. If `config.system_appearance` is true, frontend also calls `invoke("update_system_appearance")`

All per-app logic lives in the backend. The frontend only decides _which_ apps to update.

## File Operations

Three types of config file patching, all in `src-tauri/src/updaters/file_ops/`:

- **`patch_text_file`** — regex find-and-replace with template variables. Used by ghostty, nvim,
  tmux, delta.
- **`patch_yaml_file`** — lossless YAML merge preserving comments. Used by lazygit. Uses `yaml-edit`
  for comment preservation + `yaml_serde` for structural iteration.
- **`patch_jsonc_file`** — CST-based key/value editing preserving comments and formatting. Used by
  zed, obsidian. Uses `jsonc-parser` for format-preserving edits.

All three enforce home-directory restriction and use atomic writes (temp file + persist).

## Configuration

- **Config file:** `~/.config/black-atom/livery/config.json`
- **`enabled` flag per app.** Presence in config means configured, `enabled` controls whether it
  runs. Users can disable an app without losing their path settings.
- **Default patterns in Rust.** `match_pattern` / `replace_template` defaults live in
  `Config::default()` (`src-tauri/src/config/defaults.rs`). Merged into user configs on read.
- **`~` expansion** handled by Rust. `config_path` is expanded for the frontend; `themes_path` is
  NOT expanded (used in templates).
- **Delta** uses a separate `~/.gitconfig.delta` include file, not `.gitconfig` directly.

## Supported Apps

| App               | Method                                          | Reload                     |
| ----------------- | ----------------------------------------------- | -------------------------- |
| ghostty           | `patch_text_file` (regex)                       | SIGUSR2                    |
| nvim              | `patch_text_file` (regex)                       | socket `nvim --server`     |
| tmux              | `patch_text_file` (regex)                       | `tmux source-file`         |
| delta             | `patch_text_file` (regex)                       | none (reads on invocation) |
| lazygit           | `patch_yaml_file` (YAML merge)                  | none (reads on launch)     |
| zed               | `patch_jsonc_file` (JSONC CST)                  | none (auto-watches)        |
| obsidian          | `patch_jsonc_file` (JSONC CST)                  | `obsidian://` URI          |
| system appearance | `osascript` (macOS) / `gsettings` (Linux/GNOME) | immediate                  |
