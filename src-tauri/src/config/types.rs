use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;

/// Supported app names. TypeScript bindings are auto-generated via tauri-specta.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum AppName {
    Nvim,
    Tmux,
    Ghostty,
    Zed,
    Delta,
    Lazygit,
    Obsidian,
}

impl AppName {
    pub fn as_str(&self) -> &'static str {
        match self {
            AppName::Nvim => "nvim",
            AppName::Tmux => "tmux",
            AppName::Ghostty => "ghostty",
            AppName::Zed => "zed",
            AppName::Delta => "delta",
            AppName::Lazygit => "lazygit",
            AppName::Obsidian => "obsidian",
        }
    }
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
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

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Config {
    pub system_appearance: bool,
    pub apps: HashMap<AppName, AppConfig>,
}
