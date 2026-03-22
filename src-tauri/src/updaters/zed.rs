use crate::config::types::AppConfig;

use super::file_ops;
use super::{UpdateContext, UpdateResult};

/// Update Zed's settings.json with the theme display name.
///
/// Handles two formats:
/// - Flat: `"theme": "Theme Name"` → sets "theme" directly
/// - Object: `"theme": { "dark": "...", "light": "..." }` → sets "theme.dark" or "theme.light"
///
/// Auto-detects format by checking if the "theme" value is a string or object.
/// Zed should auto-reload on file change, but has a known bug where external
/// changes aren't always detected (zed-industries/zed#38109).
/// Fix expected in Zed stable ~March 25, 2026 via zed-industries/zed#51208.
/// See DEV-331 for tracking.
pub fn update(app_str: &str, app_config: &AppConfig, ctx: &UpdateContext) -> UpdateResult {
    let theme_label = match ctx.theme_label {
        Some(name) if !name.is_empty() => name,
        _ => return UpdateResult::error(app_str, "Missing theme_label for Zed theme"),
    };

    // Detect theme format by reading the file and checking the "theme" value type
    let path = shellexpand::tilde(&app_config.config_path).to_string();
    let content = match std::fs::read_to_string(&path) {
        Ok(c) => c,
        Err(e) => return UpdateResult::error(app_str, format!("Failed to read {path}: {e}")),
    };

    let key_path = match detect_theme_format(&content) {
        ThemeFormat::FlatString => "theme",
        ThemeFormat::Object => {
            if ctx.appearance == "dark" {
                "theme.dark"
            } else {
                "theme.light"
            }
        }
        ThemeFormat::NotFound => {
            return UpdateResult::error(app_str, "No 'theme' key found in Zed settings");
        }
    };

    match file_ops::jsonc::patch_jsonc_file(app_config.config_path.clone(), key_path, theme_label) {
        Ok(()) => UpdateResult::done(app_str),
        Err(e) => UpdateResult::error(app_str, e),
    }
}

enum ThemeFormat {
    FlatString,
    Object,
    NotFound,
}

/// Detect whether the "theme" key in the JSONC content is a string or an object.
fn detect_theme_format(content: &str) -> ThemeFormat {
    let root = match jsonc_parser::cst::CstRootNode::parse(
        content,
        &jsonc_parser::ParseOptions::default(),
    ) {
        Ok(r) => r,
        Err(_) => return ThemeFormat::NotFound,
    };

    let root_obj = match root.object_value() {
        Some(obj) => obj,
        None => return ThemeFormat::NotFound,
    };

    let prop = match root_obj.get("theme") {
        Some(p) => p,
        None => return ThemeFormat::NotFound,
    };

    match prop.value() {
        Some(val) if val.as_object().is_some() => ThemeFormat::Object,
        Some(_) => ThemeFormat::FlatString,
        None => ThemeFormat::NotFound,
    }
}
