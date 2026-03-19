import { invoke } from "@tauri-apps/api/core";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { UpdateResult } from "../types/updaters.ts";
import { replaceConfigPattern } from "../lib/replace-config-pattern.ts";
import { APP_PATTERN_DEFAULTS } from "./defaults.ts";
import type { UpdaterContext } from "./registry.ts";

export async function runNvimUpdater(ctx: UpdaterContext): Promise<UpdateResult> {
    const { themeKey, appConfig } = ctx;
    const defaults = APP_PATTERN_DEFAULTS.nvim;
    const matchPattern = appConfig.match_pattern ?? defaults?.matchPattern;
    const replaceTemplate = appConfig.replace_template ?? defaults?.replaceTemplate;

    if (!matchPattern || !replaceTemplate) {
        return { app: "nvim", status: "error", message: "No pattern defaults for nvim" };
    }

    try {
        const content = await readTextFile(appConfig.config_path);
        const updated = replaceConfigPattern({ content, matchPattern, replaceTemplate, themeKey });
        await writeTextFile(appConfig.config_path, updated);

        await invoke("reload_nvim", { themeKey });

        return { app: "nvim", status: "done" };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("[nvim updater]", error);
        return { app: "nvim", status: "error", message };
    }
}
