use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri_plugin_fs::FsExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolConfig {
    pub enabled: bool,
    pub config_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub themes_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub system_appearance: bool,
    pub tools: HashMap<String, ToolConfig>,
}

impl Default for Config {
    fn default() -> Self {
        let mut tools = HashMap::new();
        tools.insert(
            "ghostty".to_string(),
            ToolConfig {
                enabled: true,
                config_path: "~/.config/ghostty/config".to_string(),
                themes_path: None,
            },
        );
        Config {
            system_appearance: true,
            tools,
        }
    }
}

fn config_path() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_default();
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

pub fn scope_config_paths(app: &AppHandle, config: &Config) {
    let scope = app.fs_scope();
    for (name, tool) in &config.tools {
        if tool.enabled {
            let path = shellexpand::tilde(&tool.config_path).to_string();
            if let Err(e) = scope.allow_file(&path) {
                log::warn!("Failed to scope {name} config_path: {e}");
            }
            if let Some(ref tp) = tool.themes_path {
                let expanded = shellexpand::tilde(tp).to_string();
                if let Err(e) = scope.allow_directory(&expanded, true) {
                    log::warn!("Failed to scope {name} themes_path: {e}");
                }
            }
        }
    }
}

/// Expand tilde in all tool paths so the frontend receives absolute paths.
fn expand_tool_paths(config: &mut Config) {
    for tool in config.tools.values_mut() {
        tool.config_path = shellexpand::tilde(&tool.config_path).to_string();
        if let Some(ref tp) = tool.themes_path {
            tool.themes_path = Some(shellexpand::tilde(tp).to_string());
        }
    }
}

/// Re-tilde absolute paths so they are stored portably on disk.
fn collapse_tool_paths(config: &mut Config) {
    if let Some(home) = dirs::home_dir() {
        let home_str = home.to_string_lossy().to_string();
        for tool in config.tools.values_mut() {
            if tool.config_path.starts_with(&home_str) {
                tool.config_path = tool.config_path.replacen(&home_str, "~", 1);
            }
            if let Some(ref tp) = tool.themes_path {
                if tp.starts_with(&home_str) {
                    tool.themes_path = Some(tp.replacen(&home_str, "~", 1));
                }
            }
        }
    }
}

#[tauri::command]
pub fn get_config(app: AppHandle) -> Config {
    let mut config = read_config_from_disk();

    // Ensure config file exists on disk (first launch)
    let path = config_path();
    if !path.exists() {
        let _ = write_config_to_disk(&config);
    }

    // Scope paths for enabled tools
    scope_config_paths(&app, &config);

    // Return expanded paths to frontend (FS plugin needs absolute paths)
    expand_tool_paths(&mut config);
    config
}

#[tauri::command]
pub fn save_config(app: AppHandle, mut config: Config) -> Result<(), String> {
    // Re-tilde paths before writing so the config file stays portable
    collapse_tool_paths(&mut config);
    write_config_to_disk(&config)?;
    scope_config_paths(&app, &config);
    Ok(())
}
