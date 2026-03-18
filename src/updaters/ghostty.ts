import type { ThemeKey } from "@black-atom/core";
import { invoke } from "@tauri-apps/api/core";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { AppConfig } from "../types/apps.ts";
import type { UpdateResult } from "../types/updaters.ts";
import { replaceConfigPattern } from "../lib/replace-config-pattern.ts";
import { APP_PATTERN_DEFAULTS } from "./defaults.ts";

export async function runGhosttyUpdater(
    themeKey: ThemeKey,
    appConfig: AppConfig,
): Promise<UpdateResult> {
    const defaults = APP_PATTERN_DEFAULTS.ghostty;
    const matchPattern = appConfig.match_pattern ?? defaults?.matchPattern;
    const replaceTemplate = appConfig.replace_template ?? defaults?.replaceTemplate;

    if (!matchPattern || !replaceTemplate) {
        return { app: "ghostty", status: "error", message: "No pattern defaults for ghostty" };
    }

    try {
        const content = await readTextFile(appConfig.config_path);
        const updated = replaceConfigPattern({ content, matchPattern, replaceTemplate, themeKey });
        await writeTextFile(appConfig.config_path, updated);

        await invoke("reload_ghostty");

        return { app: "ghostty", status: "done" };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("[ghostty updater]", error);
        return { app: "ghostty", status: "error", message };
    }
}
