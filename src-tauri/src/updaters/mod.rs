pub mod file_ops;
mod ghostty;
mod lazygit;
mod nvim;
mod system_appearance;
mod tmux;
mod zed;

use std::collections::HashMap;

use serde::Serialize;
use specta::Type;

use serde::Deserialize;

use crate::config::{io as config_io, types::AppName};

/// Theme metadata passed from the frontend.
#[derive(Debug, Deserialize, Type)]
pub struct ThemeContext {
    pub theme_key: String,
    pub appearance: String,
    pub collection_key: String,
    pub theme_label: Option<String>,
}

/// Context passed to each per-app updater.
///
/// `themes_path` is cloned from AppConfig for use in `build_variables()` template rendering.
/// Per-app updaters that need it as a path (e.g., lazygit) read it from AppConfig directly.
/// `theme_label` is the formatted theme label for apps like Zed that need display names.
pub struct UpdateContext<'a> {
    pub theme_key: &'a str,
    pub appearance: &'a str,
    pub collection_key: &'a str,
    pub theme_label: Option<&'a str>,
    pub themes_path: Option<String>,
}

impl UpdateContext<'_> {
    /// Build the template variable map for text-based patching.
    pub fn build_variables(&self) -> HashMap<String, String> {
        let mut vars = HashMap::new();
        vars.insert("themeKey".to_string(), self.theme_key.to_string());
        vars.insert("appearance".to_string(), self.appearance.to_string());
        vars.insert("collectionKey".to_string(), self.collection_key.to_string());
        if let Some(ref tp) = self.themes_path {
            vars.insert("themesPath".to_string(), tp.clone());
        }
        vars
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum UpdateStatus {
    Done,
    Error,
    Skipped,
}

#[derive(Debug, Serialize, Type)]
pub struct UpdateResult {
    pub app: String,
    pub status: UpdateStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

impl UpdateResult {
    pub fn done(app: &str) -> Self {
        Self {
            app: app.to_string(),
            status: UpdateStatus::Done,
            message: None,
        }
    }

    pub fn error(app: &str, msg: impl Into<String>) -> Self {
        Self {
            app: app.to_string(),
            status: UpdateStatus::Error,
            message: Some(msg.into()),
        }
    }

    pub fn skipped(app: &str, msg: impl Into<String>) -> Self {
        Self {
            app: app.to_string(),
            status: UpdateStatus::Skipped,
            message: Some(msg.into()),
        }
    }
}

/// Single entry point for all app updates. The frontend calls this once per app.
///
/// Each invocation reads config from disk independently — this is inherent to the
/// Tauri IPC model where each `invoke` call is a separate request. At the current
/// scale (~5 apps, tiny JSON file) this is fine.
#[tauri::command]
#[specta::specta]
pub async fn update_app(app: AppName, theme: ThemeContext) -> UpdateResult {
    let app_str = app.as_str();

    let mut config = config_io::read_config_from_disk();
    config_io::expand_app_paths(&mut config);

    let app_config = match config.apps.get(&app) {
        Some(c) => c.clone(),
        None => return UpdateResult::error(app_str, "App not found in config"),
    };

    if !app_config.enabled {
        return UpdateResult::skipped(app_str, "App is disabled");
    }

    let ctx = UpdateContext {
        theme_key: &theme.theme_key,
        appearance: &theme.appearance,
        collection_key: &theme.collection_key,
        theme_label: theme.theme_label.as_deref(),
        themes_path: app_config.themes_path.clone(),
    };

    match app {
        AppName::Ghostty => ghostty::update(app_str, &app_config, &ctx),
        AppName::Nvim => nvim::update(app_str, &app_config, &ctx),
        AppName::Tmux => tmux::update(app_str, &app_config, &ctx),
        AppName::Delta => patch_text_updater(app_str, &app_config, &ctx),
        AppName::Lazygit => lazygit::update(app_str, &app_config, &ctx),
        AppName::Zed => zed::update(app_str, &app_config, &ctx),
    }
}

/// Toggle system-wide dark/light mode. Separate from update_app because system
/// appearance is not an app with AppConfig — it's a standalone boolean toggle.
#[tauri::command]
#[specta::specta]
pub fn update_system_appearance(appearance: String) -> UpdateResult {
    system_appearance::update(&appearance)
}

/// Generic text-based updater for apps that only need patch_text_file (no reload).
fn patch_text_updater(
    app_str: &str,
    app_config: &crate::config::types::AppConfig,
    ctx: &UpdateContext,
) -> UpdateResult {
    let (pattern, template) = match (&app_config.match_pattern, &app_config.replace_template) {
        (Some(p), Some(t)) => (p, t),
        _ => return UpdateResult::error(app_str, "Missing match_pattern or replace_template"),
    };

    match file_ops::text::patch_text_file(
        app_config.config_path.clone(),
        pattern.clone(),
        template.clone(),
        ctx.build_variables(),
    ) {
        Ok(()) => UpdateResult::done(app_str),
        Err(e) => UpdateResult::error(app_str, e),
    }
}
