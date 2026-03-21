# Design

## Updater Flow

Theme selection triggers updaters for each enabled app:

1. User picks a theme → `UpdaterContext` is built (themeKey, appearance, collectionKey, appConfig)
2. TypeScript orchestrator calls updaters sequentially from `updaterRegistry`
3. Each updater invokes Rust commands via `invoke()` to patch config files
4. Apps that support it get a reload signal (ghostty, nvim, tmux)

## File Operations

Two types of config file patching, both in `src-tauri/src/updaters/file_ops/`:

- **`patch_text_file`** — regex find-and-replace with template variables. Used by ghostty, nvim,
  tmux, delta.
- **`patch_yaml_file`** — lossless YAML merge preserving comments. Used by lazygit. Uses `yaml-edit`
  for comment preservation + `yaml_serde` for structural iteration.

Both enforce home-directory restriction and use atomic writes (temp file + persist).

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

| App              | Method                         | Reload                     |
| ---------------- | ------------------------------ | -------------------------- |
| ghostty          | `patch_text_file` (regex)      | SIGUSR2                    |
| nvim             | `patch_text_file` (regex)      | socket `nvim --server`     |
| tmux             | `patch_text_file` (regex)      | `tmux source-file`         |
| delta            | `patch_text_file` (regex)      | none (reads on invocation) |
| lazygit          | `patch_yaml_file` (YAML merge) | none (reads on launch)     |
| zed              | planned — `patch_json_file`    | auto-watches settings      |
| macOS appearance | planned — `osascript`          | immediate                  |
