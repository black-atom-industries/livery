use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;


fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(default = "default_true")]
    pub enabled: bool,
    pub config_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub themes_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub match_pattern: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub replace_template: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub system_appearance: bool,
    pub apps: HashMap<String, AppConfig>,
}

impl Default for Config {
    fn default() -> Self {
        let mut apps = HashMap::new();
        apps.insert(
            "ghostty".to_string(),
            AppConfig {
                enabled: false,
                config_path: "~/.config/ghostty/config".to_string(),
                themes_path: None,
                match_pattern: None,
                replace_template: None,
            },
        );
        apps.insert(
            "nvim".to_string(),
            AppConfig {
                enabled: false,
                config_path: "~/.config/nvim/lua/config.lua".to_string(),
                themes_path: None,
                match_pattern: None,
                replace_template: None,
            },
        );
        apps.insert(
            "tmux".to_string(),
            AppConfig {
                enabled: false,
                config_path: "~/.config/tmux/tmux.conf".to_string(),
                themes_path: Some("~/repos/black-atom-industries/tmux/themes".to_string()),
                match_pattern: None,
                replace_template: None,
            },
        );
        apps.insert(
            "delta".to_string(),
            AppConfig {
                enabled: false,
                config_path: "~/.gitconfig.delta".to_string(),
                themes_path: None,
                match_pattern: None,
                replace_template: None,
            },
        );
        Config {
            system_appearance: true,
            apps,
        }
    }
}

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

pub fn read_config_from_disk() -> Config {
    let path = config_path();
    match fs::read_to_string(&path) {
        Ok(content) => match serde_json::from_str(&content) {
            Ok(config) => config,
            Err(e) => {
                log::warn!("Failed to parse config, using defaults: {e}");
                Config::default()
            }
        },
        Err(_) => Config::default(),
    }
}

fn write_config_to_disk(config: &Config) -> Result<(), String> {
    let path = config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create config dir: {e}"))?;
    }
    let json =
        serde_json::to_string_pretty(config).map_err(|e| format!("Failed to serialize: {e}"))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write config: {e}"))?;
    Ok(())
}

/// Expand tilde in config_path so the frontend receives absolute paths.
/// themes_path is NOT expanded — it's used in replace templates and should keep ~ for portability.
fn expand_app_paths(config: &mut Config) {
    for app_config in config.apps.values_mut() {
        app_config.config_path = shellexpand::tilde(&app_config.config_path).to_string();
    }
}

/// Re-tilde absolute paths so they are stored portably on disk.
/// The frontend receives expanded paths from get_config. When save_config is called,
/// paths that start with the home directory are collapsed back to ~/... for portability.
fn collapse_app_paths(config: &mut Config) {
    if let Some(home) = dirs::home_dir() {
        let home_prefix = format!("{}/", home.to_string_lossy());
        for app_config in config.apps.values_mut() {
            if app_config.config_path.starts_with(&home_prefix) {
                app_config.config_path = format!("~/{}", &app_config.config_path[home_prefix.len()..]);
            }
            if let Some(ref tp) = app_config.themes_path {
                if tp.starts_with(&home_prefix) {
                    app_config.themes_path = Some(format!("~/{}", &tp[home_prefix.len()..]));
                }
            }
        }
    }
}

#[tauri::command]
pub fn get_config() -> Config {
    let path = config_path();

    // Create default config file on first launch
    if !path.exists() {
        let _ = write_config_to_disk(&Config::default());
    }

    let mut config = read_config_from_disk();

    // Return expanded paths to frontend
    expand_app_paths(&mut config);
    config
}

#[tauri::command]
pub fn save_config(mut config: Config) -> Result<(), String> {
    // Re-tilde paths before writing so the config file stays portable
    collapse_app_paths(&mut config);
    write_config_to_disk(&config)?;
    Ok(())
}
