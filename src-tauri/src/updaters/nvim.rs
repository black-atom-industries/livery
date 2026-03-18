use std::path::{Path, PathBuf};

/// Validate that a theme key only contains safe characters (alphanumeric, hyphens, underscores).
fn is_valid_theme_key(key: &str) -> bool {
    !key.is_empty() && key.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_')
}

/// Find all Neovim server sockets in the given tmpdir.
/// Neovim auto-creates sockets at $TMPDIR/nvim.<user>/*/nvim.*
// TODO: Also check $XDG_RUNTIME_DIR on Linux for nvim sockets
fn find_nvim_sockets(tmpdir: &Path) -> Vec<PathBuf> {
    let mut sockets = Vec::new();

    let Ok(entries) = std::fs::read_dir(tmpdir) else {
        return sockets;
    };

    for entry in entries.flatten() {
        let dir_name = entry.file_name();
        if !dir_name.to_string_lossy().starts_with("nvim.") {
            continue;
        }

        let nvim_dir = entry.path();
        let Ok(sub_entries) = std::fs::read_dir(&nvim_dir) else {
            continue;
        };

        for sub_entry in sub_entries.flatten() {
            let Ok(sub_files) = std::fs::read_dir(sub_entry.path()) else {
                continue;
            };

            for socket_entry in sub_files.flatten() {
                let socket_path = socket_entry.path();
                let socket_name = socket_path
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();

                if socket_name.starts_with("nvim.") {
                    sockets.push(socket_path);
                }
            }
        }
    }

    sockets
}

/// Reload all running Neovim instances by sending :colorscheme via server sockets.
/// Non-zero exit from nvim --server is fine — means that socket is stale.
#[tauri::command]
pub fn reload_nvim(theme_key: String) -> Result<(), String> {
    if !is_valid_theme_key(&theme_key) {
        return Err(format!("Invalid theme key: {theme_key}"));
    }

    let tmpdir = std::env::var("TMPDIR").unwrap_or_else(|_| "/tmp".to_string());
    let sockets = find_nvim_sockets(Path::new(&tmpdir));

    if sockets.is_empty() {
        log::info!("No nvim sockets found");
        return Ok(());
    }

    let cmd = format!(":colorscheme {}<CR>", theme_key);

    for socket_path in &sockets {
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
                log::info!("Sent colorscheme {} to {}", theme_key, socket_path.display());
            }
        }
    }

    Ok(())
}
