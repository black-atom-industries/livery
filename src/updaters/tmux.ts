import { invoke } from "@tauri-apps/api/core";
import type { UpdateResult } from "../types/updaters.ts";
import { APP_PATTERN_DEFAULTS } from "./defaults.ts";
import type { UpdaterContext } from "./registry.ts";

export async function runTmuxUpdater(ctx: UpdaterContext): Promise<UpdateResult> {
    const { themeKey, collectionKey, appConfig } = ctx;
    const defaults = APP_PATTERN_DEFAULTS.tmux;
    const matchPattern = appConfig.match_pattern ?? defaults?.matchPattern;
    const replaceTemplate = appConfig.replace_template ?? defaults?.replaceTemplate;

    if (!matchPattern || !replaceTemplate) {
        return { app: "tmux", status: "error", message: "No pattern defaults for tmux" };
    }

    try {
        await invoke("replace_in_file", {
            path: appConfig.config_path,
            matchPattern,
            replaceTemplate,
            variables: {
                themeKey,
                collectionKey,
                themesPath: appConfig.themes_path ?? "",
            },
        });

        await invoke("reload_tmux", { configPath: appConfig.config_path });

        return { app: "tmux", status: "done" };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("[tmux updater]", error);
        return { app: "tmux", status: "error", message };
    }
}
