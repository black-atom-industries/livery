use std::collections::HashMap;

use crate::config::types::AppConfig;

use super::file_ops;
use super::UpdateResult;

pub fn update(
    app_str: &str,
    app_config: &AppConfig,
    variables: &HashMap<String, String>,
) -> UpdateResult {
    let (pattern, template) = match (&app_config.match_pattern, &app_config.replace_template) {
        (Some(p), Some(t)) => (p, t),
        _ => return UpdateResult::error(app_str, "Missing match_pattern or replace_template"),
    };

    if let Err(e) = file_ops::text::patch_text_file(
        app_config.config_path.clone(),
        pattern.clone(),
        template.clone(),
        variables.clone(),
    ) {
        return UpdateResult::error(app_str, e);
    }

    reload();
    UpdateResult::done(app_str)
}

/// Send SIGUSR2 to ghostty to reload config.
/// Returns Ok even if ghostty isn't running — the config file is already updated.
fn reload() {
    match std::process::Command::new("pkill")
        .args(["-SIGUSR2", "ghostty"])
        .output()
    {
        Ok(output) => {
            if !output.status.success() {
                log::info!("pkill returned non-zero (ghostty may not be running)");
            }
        }
        Err(e) => {
            log::warn!("Failed to run pkill: {e}");
        }
    }
}
