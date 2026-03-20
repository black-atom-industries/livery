use std::fs;
use std::path::PathBuf;

use super::types::Config;

/// Path to the livery config file.
fn config_path() -> PathBuf {
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => {
            log::warn!("Could not determine home directory, using current directory");
            PathBuf::new()
        }
    };
    home.join(".config")
        .join("black-atom")
        .join("livery")
        .join("config.json")
}

/// Merge user config with defaults — fills in missing fields from the default config.
/// This intentionally hydrates the user's config with all default apps (disabled).
/// When save_config is called, all apps are written to disk — this ensures the config
/// file always contains the full list of supported apps for the settings UI.
fn merge_with_defaults(mut user_config: Config) -> Config {
    let defaults = Config::default();

    for (name, default_app) in &defaults.apps {
        match user_config.apps.get_mut(name) {
            Some(app) => {
                if app.match_pattern.is_none() {
                    app.match_pattern = default_app.match_pattern.clone();
                }
                if app.replace_template.is_none() {
                    app.replace_template = default_app.replace_template.clone();
                }
            }
            None => {
                user_config.apps.insert(*name, default_app.clone());
            }
        }
    }

    user_config
}

/// Read config from disk and merge with defaults.
pub fn read_config_from_disk() -> Config {
    let path = config_path();
    let user_config = match fs::read_to_string(&path) {
        Ok(content) => match serde_json::from_str(&content) {
            Ok(config) => config,
            Err(e) => {
                log::warn!("Failed to parse config, using defaults: {e}");
                Config::default()
            }
        },
        Err(_) => Config::default(),
    };

    merge_with_defaults(user_config)
}

/// Write config to disk.
pub fn write_config_to_disk(config: &Config) -> Result<(), String> {
    let path = config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create config dir: {e}"))?;
    }
    let json =
        serde_json::to_string_pretty(config).map_err(|e| format!("Failed to serialize: {e}"))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write config: {e}"))?;
    Ok(())
}

/// Ensure the config file exists on disk (creates with defaults on first launch).
pub fn ensure_config_exists() {
    let path = config_path();
    if !path.exists() {
        let _ = write_config_to_disk(&Config::default());
    }
}

/// Expand tilde in config_path so the frontend receives absolute paths.
/// themes_path is NOT expanded — it's used in replace templates and should keep ~ for portability.
pub fn expand_app_paths(config: &mut Config) {
    for app_config in config.apps.values_mut() {
        app_config.config_path = shellexpand::tilde(&app_config.config_path).to_string();
    }
}

/// Re-tilde absolute paths so they are stored portably on disk.
pub fn collapse_app_paths(config: &mut Config) {
    if let Some(home) = dirs::home_dir() {
        let home_prefix = format!("{}/", home.to_string_lossy());
        for app_config in config.apps.values_mut() {
            if app_config.config_path.starts_with(&home_prefix) {
                app_config.config_path =
                    format!("~/{}", &app_config.config_path[home_prefix.len()..]);
            }
            if let Some(ref tp) = app_config.themes_path {
                if tp.starts_with(&home_prefix) {
                    app_config.themes_path = Some(format!("~/{}", &tp[home_prefix.len()..]));
                }
            }
        }
    }
}
