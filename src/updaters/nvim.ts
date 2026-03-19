import { invoke } from "@tauri-apps/api/core";
import type { UpdateResult } from "../types/updaters.ts";
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
        await invoke("replace_in_file", {
            path: appConfig.config_path,
            matchPattern,
            replaceTemplate,
            variables: { themeKey },
        });

        await invoke("reload_nvim", { themeKey });

        return { app: "nvim", status: "done" };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("[nvim updater]", error);
        return { app: "nvim", status: "error", message };
    }
}
