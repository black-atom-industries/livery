import type { ThemeKey } from "@black-atom/core";
import { invoke } from "@tauri-apps/api/core";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { AppConfig } from "../types/apps.ts";
import type { UpdateResult } from "../types/updaters.ts";
import { replaceConfigPattern } from "../lib/replace-config-pattern.ts";
import { APP_PATTERN_DEFAULTS } from "./defaults.ts";

const DEFAULTS = APP_PATTERN_DEFAULTS.nvim!;

export async function runNvimUpdater(
    themeKey: ThemeKey,
    appConfig: AppConfig,
): Promise<UpdateResult> {
    const matchPattern = appConfig.match_pattern ?? DEFAULTS.matchPattern;
    const replaceTemplate = appConfig.replace_template ?? DEFAULTS.replaceTemplate;

    try {
        // Persist: update config file
        const content = await readTextFile(appConfig.config_path);
        const updated = replaceConfigPattern(content, matchPattern, replaceTemplate, themeKey);
        await writeTextFile(appConfig.config_path, updated);

        // Live reload: send :colorscheme to all running nvim instances
        await invoke("reload_nvim", { themeKey });

        return { app: "nvim", status: "done" };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[nvim updater]", error);
        return { app: "nvim", status: "error", message };
    }
}
