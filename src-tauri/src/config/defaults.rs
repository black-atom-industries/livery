use std::collections::HashMap;

use super::types::{AppConfig, AppName, Config};

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
        apps.insert(
            AppName::Zed,
            AppConfig {
                enabled: false,
                config_path: "~/.config/zed/settings.json".to_string(),
                themes_path: None,
                match_pattern: None, // not used — JSONC editing is structural
                replace_template: None,
            },
        );
        apps.insert(
            AppName::Lazygit,
            AppConfig {
                enabled: false,
                config_path: "~/.config/lazygit/config.yml".to_string(),
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
