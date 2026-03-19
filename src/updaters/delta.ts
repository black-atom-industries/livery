import { invoke } from "@tauri-apps/api/core";
import type { UpdateResult } from "../types/updaters.ts";
import { APP_PATTERN_DEFAULTS } from "./defaults.ts";
import type { UpdaterContext } from "./registry.ts";

export async function runDeltaUpdater(ctx: UpdaterContext): Promise<UpdateResult> {
    const { themeKey, appearance, appConfig } = ctx;
    const defaults = APP_PATTERN_DEFAULTS.delta;
    const matchPattern = appConfig.match_pattern ?? defaults?.matchPattern;
    const replaceTemplate = appConfig.replace_template ?? defaults?.replaceTemplate;

    if (!matchPattern || !replaceTemplate) {
        return { app: "delta", status: "error", message: "No pattern defaults for delta" };
    }

    try {
        await invoke("replace_in_file", {
            path: appConfig.config_path,
            matchPattern,
            replaceTemplate,
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
