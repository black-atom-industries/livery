export type AppName = "nvim" | "tmux" | "ghostty" | "zed" | "delta" | "lazygit";

export interface AppConfig {
    enabled: boolean;
    config_path: string;
    themes_path?: string;
    match_pattern?: string;
    replace_template?: string;
}

export interface Config {
    system_appearance: boolean;
    apps: Partial<Record<AppName, AppConfig>>;
}
