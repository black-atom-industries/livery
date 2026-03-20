import { invoke } from "@tauri-apps/api/core";
import type { UpdateResult } from "../types/updaters.ts";
import type { UpdaterContext } from "./registry.ts";

export async function runTmuxUpdater(ctx: UpdaterContext): Promise<UpdateResult> {
    const { themeKey, collectionKey, appConfig } = ctx;
    const { config_path, match_pattern, replace_template, themes_path } = appConfig;

    if (!match_pattern || !replace_template) {
        return {
            app: "tmux",
            status: "error",
            message: "Missing match_pattern or replace_template",
        };
    }

    try {
        await invoke("patch_text_file", {
            path: config_path,
            matchPattern: match_pattern,
            replaceTemplate: replace_template,
            variables: {
                themeKey,
                collectionKey,
                themesPath: themes_path ?? "",
            },
        });

        await invoke("reload_tmux", { configPath: config_path });

        return { app: "tmux", status: "done" };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("[tmux updater]", error);
        return { app: "tmux", status: "error", message };
    }
}
