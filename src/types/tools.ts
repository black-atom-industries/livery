export type ToolName = "nvim" | "tmux" | "ghostty" | "zed" | "delta";

export interface ToolConfig {
    config_path: string;
    themes_path?: string;
}
