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

        if !dir_name_str.starts_with("nvim.") {
            continue;
        }

        let nvim_dir = entry.path();
        if let Ok(sub_entries) = std::fs::read_dir(&nvim_dir) {
            for sub_entry in sub_entries.flatten() {
                let sub_path = sub_entry.path();
                if let Ok(sub_files) = std::fs::read_dir(&sub_path) {
                    for socket_entry in sub_files.flatten() {
                        let socket_path = socket_entry.path();
                        let socket_name = socket_path
                            .file_name()
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
