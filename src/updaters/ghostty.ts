import { invoke } from "@tauri-apps/api/core";
import type { UpdateResult } from "../types/updaters.ts";
import type { UpdaterContext } from "./registry.ts";

export async function runGhosttyUpdater(ctx: UpdaterContext): Promise<UpdateResult> {
    const { themeKey, appConfig } = ctx;
    const { config_path, match_pattern, replace_template } = appConfig;

    if (!match_pattern || !replace_template) {
        return {
            app: "ghostty",
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

        await invoke("reload_ghostty");

        return { app: "ghostty", status: "done" };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("[ghostty updater]", error);
        return { app: "ghostty", status: "error", message };
    }
}
