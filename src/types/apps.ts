export type AppName = "nvim" | "tmux" | "ghostty" | "zed" | "delta";

export interface AppConfig {
    enabled: boolean;
    config_path: string;
    themes_path?: string;
    match_pattern?: string;
    replace_template?: string;
}
