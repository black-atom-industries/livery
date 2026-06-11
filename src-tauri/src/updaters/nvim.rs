use std::path::{Path, PathBuf};

use crate::config::types::AppConfig;

use super::file_ops;
use super::{UpdateContext, UpdateResult};

/// Update nvim config and reload running instances.
/// `max_sockets` limits how many instances to send to (None = all, Some(1) = benchmark mode).
pub fn update(
    app_str: &str,
    app_config: &AppConfig,
    ctx: &UpdateContext,
    max_sockets: Option<usize>,
) -> UpdateResult {
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

    if let Err(msg) = reload(ctx.theme_key, max_sockets) {
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

/// Check whether a file name matches Neovim's server socket naming convention:
/// `<appname>.<pid>.<instance>`, e.g. `nvim.12345.0` or `nvim-edit.12345.0`.
/// The appname segment varies with `$NVIM_APPNAME`, so only the trailing
/// `.<pid>.<instance>` (both numeric) is checked.
fn is_nvim_socket_name(name: &str) -> bool {
    let mut parts = name.rsplitn(3, '.');
    let (Some(instance), Some(pid), Some(appname)) = (parts.next(), parts.next(), parts.next())
    else {
        return false;
    };
    !appname.is_empty()
        && !pid.is_empty()
        && !instance.is_empty()
        && pid.chars().all(|c| c.is_ascii_digit())
        && instance.chars().all(|c| c.is_ascii_digit())
}

/// Find all Neovim server sockets in the given tmpdir.
/// Neovim auto-creates sockets at $TMPDIR/nvim.<user>/*/<appname>.<pid>.<instance>
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

                if is_nvim_socket_name(&socket_name) {
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
fn reload(theme_key: &str, max_sockets: Option<usize>) -> Result<(), String> {
    if !is_valid_theme_key(theme_key) {
        return Err(format!("Invalid theme key for nvim reload: {theme_key}"));
    }

    let tmpdir = std::env::var("TMPDIR").unwrap_or_else(|_| "/tmp".to_string());
    let mut sockets = find_nvim_sockets(Path::new(&tmpdir));
    if let Some(limit) = max_sockets {
        sockets.truncate(limit);
    }

    if sockets.is_empty() {
        log::info!("No nvim sockets found — will apply on next launch");
        return Ok(());
    }

    let cmd = format!(":colorscheme {}<CR>", theme_key);
    let total = sockets.len();

    // Send to all sockets in parallel — each is an independent subprocess
    let counts: Vec<_> = std::thread::scope(|s| {
        let handles: Vec<_> = sockets
            .iter()
            .map(|socket_path| {
                let cmd = &cmd;
                s.spawn(move || {
                    let result = std::process::Command::new("nvim")
                        .args([
                            "--server",
                            &socket_path.to_string_lossy(),
                            "--remote-send",
                            cmd,
                        ])
                        .output();

                    match result {
                        Ok(output) if !output.status.success() => {
                            log::debug!("Stale nvim socket: {}", socket_path.display());
                            (0u32, 1u32, 0u32) // (sent, stale, failed)
                        }
                        Err(e) => {
                            log::warn!("Failed to send to nvim socket: {e}");
                            (0, 0, 1)
                        }
                        _ => {
                            log::debug!("Sent colorscheme to {}", socket_path.display());
                            (1, 0, 0)
                        }
                    }
                })
            })
            .collect();

        handles.into_iter().map(|h| h.join().unwrap()).collect()
    });

    let (sent, stale, failed) = counts
        .iter()
        .fold((0u32, 0u32, 0u32), |(s, st, f), &(ds, dst, df)| {
            (s + ds, st + dst, f + df)
        });

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_nvim_socket_name() {
        assert!(is_nvim_socket_name("nvim.12345.0"));
        assert!(is_nvim_socket_name("nvim-edit.12345.0"));
        assert!(is_nvim_socket_name("lazyvim.1.0"));
    }

    #[test]
    fn test_is_nvim_socket_name_rejects_non_sockets() {
        assert!(!is_nvim_socket_name("nvim"));
        assert!(!is_nvim_socket_name("nvim.lock"));
        assert!(!is_nvim_socket_name("nvim..0"));
        assert!(!is_nvim_socket_name(".12345.0"));
        assert!(!is_nvim_socket_name("nvim.12345.abc"));
    }
}
