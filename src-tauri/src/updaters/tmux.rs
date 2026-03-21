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

    reload(&app_config.config_path);
    UpdateResult::done(app_str)
}

/// Reload tmux by sourcing the config file.
fn reload(config_path: &str) {
    match std::process::Command::new("tmux")
        .args(["source-file", config_path])
        .output()
    {
        Ok(output) => {
            if output.status.success() {
                log::info!("Reloaded tmux config: {config_path}");
            } else {
                log::info!("tmux source-file returned non-zero (tmux may not be running)");
            }
        }
        Err(e) => {
            log::warn!("Failed to run tmux: {e}");
        }
    }
}
