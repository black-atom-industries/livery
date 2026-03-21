import { invoke } from "@tauri-apps/api/core";
import type { UpdateResult } from "../types/updaters.ts";
import type { UpdaterContext } from "./registry.ts";

export async function runNvimUpdater(ctx: UpdaterContext): Promise<UpdateResult> {
    const { themeKey, appConfig } = ctx;
    const { config_path, match_pattern, replace_template } = appConfig;

    if (!match_pattern || !replace_template) {
        return {
            app: "nvim",
            status: "error",
            message: "Missing match_pattern or replace_template",
        };
    }

    try {
        await invoke("patch_text_file", {
            path: config_path,
            matchPattern: match_pattern,
            replaceTemplate: replace_template,
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
