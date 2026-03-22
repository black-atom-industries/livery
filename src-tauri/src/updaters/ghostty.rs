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

    if let Err(msg) = reload() {
        log::warn!("{msg}");
        return UpdateResult::skipped(
            app_str,
            format!("Config patched; live reload failed: {msg}"),
        );
    }

    log::info!("Updated ghostty config: {}", app_config.config_path);
    UpdateResult::done(app_str)
}

/// Send SIGUSR2 to ghostty to reload config.
/// Non-zero exit from pkill is not an error — ghostty may not be running.
fn reload() -> Result<(), String> {
    match std::process::Command::new("pkill")
        .args(["-SIGUSR2", "ghostty"])
        .output()
    {
        Ok(output) => {
            if !output.status.success() {
                log::info!("pkill returned non-zero (ghostty may not be running)");
            }
            Ok(())
        }
        Err(e) => Err(format!("Failed to run pkill: {e}")),
    }
}
