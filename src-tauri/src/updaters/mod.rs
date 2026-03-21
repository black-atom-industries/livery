pub mod file_ops;
mod ghostty;
mod lazygit;
mod nvim;
mod tmux;

use std::collections::HashMap;

use serde::Serialize;

use crate::config::{io as config_io, types::AppName};

/// Context passed to each per-app updater.
pub struct UpdateContext<'a> {
    pub theme_key: &'a str,
    pub appearance: &'a str,
    pub collection_key: &'a str,
}

#[derive(Debug, Serialize)]
pub struct UpdateResult {
    pub app: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

impl UpdateResult {
    pub fn done(app: &str) -> Self {
        Self {
            app: app.to_string(),
            status: "done".to_string(),
            message: None,
        }
    }

    pub fn error(app: &str, msg: impl Into<String>) -> Self {
        Self {
            app: app.to_string(),
            status: "error".to_string(),
            message: Some(msg.into()),
        }
    }
}

/// Single entry point for all app updates. The frontend calls this once per app.
#[tauri::command]
pub fn update_app(
    app: AppName,
    theme_key: String,
    appearance: String,
    collection_key: String,
) -> UpdateResult {
    let app_str = app.as_str();

    let mut config = config_io::read_config_from_disk();
    config_io::expand_app_paths(&mut config);

    let app_config = match config.apps.get(&app) {
        Some(c) => c.clone(),
        None => return UpdateResult::error(app_str, "App not found in config"),
    };

    let ctx = UpdateContext {
        theme_key: &theme_key,
        appearance: &appearance,
        collection_key: &collection_key,
    };

    // Build template variables from context
    let variables = build_variables(&ctx, app_config.themes_path.as_deref());

    match app {
        AppName::Ghostty => ghostty::update(app_str, &app_config, &variables),
        AppName::Nvim => nvim::update(app_str, &app_config, &variables),
        AppName::Tmux => tmux::update(app_str, &app_config, &variables),
        AppName::Delta => patch_text_updater(app_str, &app_config, &variables),
        AppName::Lazygit => lazygit::update(app_str, &app_config, &ctx),
        AppName::Zed => UpdateResult::error(app_str, "Zed updater not yet implemented"),
    }
}

/// Build the template variable map from context.
fn build_variables(ctx: &UpdateContext, themes_path: Option<&str>) -> HashMap<String, String> {
    let mut vars = HashMap::new();
    vars.insert("themeKey".to_string(), ctx.theme_key.to_string());
    vars.insert("appearance".to_string(), ctx.appearance.to_string());
    vars.insert("collectionKey".to_string(), ctx.collection_key.to_string());
    if let Some(tp) = themes_path {
        vars.insert("themesPath".to_string(), tp.to_string());
    }
    vars
}

/// Generic text-based updater for apps that only need patch_text_file (no reload).
fn patch_text_updater(
    app_str: &str,
    app_config: &crate::config::types::AppConfig,
    variables: &HashMap<String, String>,
) -> UpdateResult {
    let (pattern, template) = match (&app_config.match_pattern, &app_config.replace_template) {
        (Some(p), Some(t)) => (p, t),
        _ => return UpdateResult::error(app_str, "Missing match_pattern or replace_template"),
    };

    match file_ops::text::patch_text_file(
        app_config.config_path.clone(),
        pattern.clone(),
        template.clone(),
        variables.clone(),
    ) {
        Ok(()) => UpdateResult::done(app_str),
        Err(e) => UpdateResult::error(app_str, e),
    }
}
