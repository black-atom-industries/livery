# Backend (Rust / Tauri)

The Rust backend is the **executor** — all OS operations (file I/O, process signals, socket
communication) happen here. TypeScript never touches the filesystem directly.

## Module Structure

```
src-tauri/src/
  lib.rs                    # Tauri command registration
  config/
    types.rs                # AppName enum, AppConfig, Config structs
    defaults.rs             # Config::default() — pattern defaults per app
    commands.rs             # get_config, save_config Tauri commands
    io.rs                   # Disk I/O, tilde expansion, default merging
  updaters/
    file_ops/
      text.rs               # patch_text_file — regex replace with template variables
      yaml.rs               # patch_yaml_file — lossless YAML merge (yaml-edit + yaml_serde)
    ghostty.rs              # reload_ghostty (SIGUSR2)
    nvim.rs                 # reload_nvim (socket)
    tmux.rs                 # reload_tmux (source-file)
```

## Conventions

- Every Tauri command validates paths are under `$HOME` before writing
- Atomic writes via `tempfile::NamedTempFile` + `persist()`
- Tilde expansion (`shellexpand::tilde`) on paths received from the frontend
- Tests use `#[cfg(test)] mod tests` within source files
- Fixture-based testing for file operations — see the `backend-testing` skill

## Adding a New Updater

1. Add variant to `AppName` enum in `config/types.rs`
2. Add default config in `config/defaults.rs`
3. Add the TypeScript `AppName` union member in `src/types/config.ts`
4. Choose file operation: `patch_text_file` (regex) or `patch_yaml_file` (YAML merge)
5. If the app needs reload: add a Rust reload command in `updaters/`, register in `lib.rs`
6. Create the TypeScript updater in `src/updaters/`, register in `registry.ts`
7. Add fixture files in `tests/fixtures/` and write tests
