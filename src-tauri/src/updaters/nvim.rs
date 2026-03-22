use std::path::{Path, PathBuf};

use crate::config::types::AppConfig;

use super::file_ops;
use super::{UpdateContext, UpdateResult};

pub fn update(app_str: &str, app_config: &AppConfig, ctx: &UpdateContext) -> UpdateResult {
    let (pattern, template) = match (&app_config.match_pattern, &app_config.replace_template) {
        (Some(p), Some(t)) => (p, t),
        _ => return UpdateResult::error(app_str, "Missing match_pattern or replace_template"),
    };

    if let Err(e) = file_ops::text::patch_text_file(
        app_config.config_path.clone(),
        pattern.clone(),
        template.clone(),
        ctx.build_variables(),
    ) {
        return UpdateResult::error(app_str, e);
    }

    if let Err(msg) = reload(ctx.theme_key) {
        log::warn!("{msg}");
        return UpdateResult::skipped(
            app_str,
            format!("Config patched; live reload failed: {msg}"),
        );
    }
    UpdateResult::done(app_str)
}

/// Validate that a theme key only contains safe characters (alphanumeric, hyphens, underscores).
fn is_valid_theme_key(key: &str) -> bool {
    !key.is_empty()
        && key
            .chars()
            .all(|c| c.is_alphanumeric() || c == '-' || c == '_')
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
/// Returns Err with a message if reload could not be attempted (e.g., invalid theme key).
/// No sockets found is not an error — nvim will pick up the theme on next open.
fn reload(theme_key: &str) -> Result<(), String> {
    if !is_valid_theme_key(theme_key) {
        return Err(format!("Invalid theme key for nvim reload: {theme_key}"));
    }

    let tmpdir = std::env::var("TMPDIR").unwrap_or_else(|_| "/tmp".to_string());
    let sockets = find_nvim_sockets(Path::new(&tmpdir));

    if sockets.is_empty() {
        log::info!("No nvim sockets found — will apply on next launch");
        return Ok(());
    }

    let cmd = format!(":colorscheme {}<CR>", theme_key);
    let total = sockets.len();
    let mut sent = 0usize;
    let mut stale = 0usize;
    let mut failed = 0usize;

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
                stale += 1;
                log::debug!("Stale nvim socket: {}", socket_path.display());
            }
            Err(e) => {
                failed += 1;
                log::warn!("Failed to send to nvim socket: {e}");
            }
            _ => {
                sent += 1;
                log::debug!("Sent colorscheme to {}", socket_path.display());
            }
        }
    }

    log::info!(
        "Sent colorscheme {} to {}/{} nvim instances{}{}",
        theme_key,
        sent,
        total,
        if stale > 0 {
            format!(" ({stale} stale)")
        } else {
            String::new()
        },
        if failed > 0 {
            format!(" ({failed} failed)")
        } else {
            String::new()
        },
    );

    Ok(())
}
