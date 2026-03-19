import { invoke } from "@tauri-apps/api/core";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { UpdateResult } from "../types/updaters.ts";
import { replaceConfigPattern } from "../lib/replace-config-pattern.ts";
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
        const content = await readTextFile(appConfig.config_path);
        const updated = replaceConfigPattern({
            content,
            matchPattern,
            replaceTemplate,
            themeKey,
            collectionKey,
            themesPath: appConfig.themes_path,
        });
        await writeTextFile(appConfig.config_path, updated);

        await invoke("reload_tmux", { configPath: appConfig.config_path });

        return { app: "tmux", status: "done" };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("[tmux updater]", error);
        return { app: "tmux", status: "error", message };
    }
}
