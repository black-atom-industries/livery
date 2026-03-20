use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Supported app names. Must be kept in sync with AppName in src/types/config.ts.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AppName {
    Nvim,
    Tmux,
    Ghostty,
    Zed, // not yet implemented — intentionally omitted from Config::default() until updater exists
    Delta,
}

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
    pub apps: HashMap<AppName, AppConfig>,
}

impl Default for Config {
    fn default() -> Self {
        let mut apps = HashMap::new();
        apps.insert(
            AppName::Ghostty,
            AppConfig {
                enabled: false,
                config_path: "~/.config/ghostty/config".to_string(),
                themes_path: None,
                match_pattern: Some(r"^theme\s*=\s*.+$".to_string()),
                replace_template: Some("theme = {themeKey}.conf".to_string()),
            },
        );
        apps.insert(
            AppName::Nvim,
            AppConfig {
                enabled: false,
                config_path: "~/.config/nvim/lua/config.lua".to_string(),
                themes_path: None,
                match_pattern: Some(r#"colorscheme\s*=\s*"[^"]*""#.to_string()),
                replace_template: Some(r#"colorscheme = "{themeKey}""#.to_string()),
            },
        );
        apps.insert(
            AppName::Tmux,
            AppConfig {
                enabled: false,
                config_path: "~/.config/tmux/tmux.conf".to_string(),
                themes_path: None, // user must set this to their tmux themes directory
                match_pattern: Some(r"^source-file\s+.+/themes/.+\.conf$".to_string()),
                replace_template: Some(
                    "source-file {themesPath}/{collectionKey}/{themeKey}.conf".to_string(),
                ),
            },
        );
        apps.insert(
            AppName::Delta,
            AppConfig {
                enabled: false,
                config_path: "~/.gitconfig.delta".to_string(),
                themes_path: None,
                match_pattern: Some(r"features\s*=\s*black-atom-(dark|light)".to_string()),
                replace_template: Some("features = black-atom-{appearance}".to_string()),
            },
        );
        Config {
            system_appearance: true,
            apps,
        }
    }
}
