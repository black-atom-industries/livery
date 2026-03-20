import { invoke } from "@tauri-apps/api/core";
import type { UpdateResult } from "../types/updaters.ts";
import type { UpdaterContext } from "./registry.ts";

export async function runLazygitUpdater(ctx: UpdaterContext): Promise<UpdateResult> {
    const { themeKey, collectionKey, appConfig } = ctx;
    const { config_path, themes_path } = appConfig;

    if (!themes_path) {
        return {
            app: "lazygit",
            status: "error",
            message: "Missing themes_path",
        };
    }

    const sourcePath = `${themes_path}/${collectionKey}/${themeKey}.yml`;

    try {
        await invoke("patch_yaml_file", {
            targetPath: config_path,
            sourcePath: sourcePath,
        });

        // No reload needed — lazygit reads config on launch
        return { app: "lazygit", status: "done" };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("[lazygit updater]", error);
        return { app: "lazygit", status: "error", message };
    }
}
