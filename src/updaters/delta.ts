import { invoke } from "@tauri-apps/api/core";
import type { UpdateResult } from "../types/updaters.ts";
import type { UpdaterContext } from "./registry.ts";

export async function runDeltaUpdater(ctx: UpdaterContext): Promise<UpdateResult> {
    const { themeKey, appearance, appConfig } = ctx;
    const { config_path, match_pattern, replace_template } = appConfig;

    if (!match_pattern || !replace_template) {
        return { app: "delta", status: "error", message: "Missing match_pattern or replace_template" };
    }

    try {
        await invoke("replace_in_file", {
            path: config_path,
            matchPattern: match_pattern,
            replaceTemplate: replace_template,
            variables: { themeKey, appearance },
        });

        // No reload needed — delta reads .gitconfig on each invocation
        return { app: "delta", status: "done" };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("[delta updater]", error);
        return { app: "delta", status: "error", message };
    }
}
