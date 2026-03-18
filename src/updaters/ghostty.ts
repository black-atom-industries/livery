import type { ThemeKey } from "@black-atom/core";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { Command } from "@tauri-apps/plugin-shell";
import type { AppConfig } from "../types/apps.ts";
import type { UpdateResult } from "../types/updaters.ts";

/**
 * Replace the `theme = ...` line in a ghostty config string.
 * Returns the updated config content.
 * Throws if no `theme = ...` line is found.
 */
export function replaceGhosttyTheme(content: string, themeKey: string): string {
    const pattern = /^theme\s*=\s*.+$/m;

    if (!pattern.test(content)) {
        throw new Error("No theme line found in ghostty config");
    }

    // Ghostty theme files use .conf extension (e.g. black-atom-default-dark.conf)
    return content.replace(pattern, `theme = ${themeKey}.conf`);
}

/**
 * Update ghostty config file with a new theme and reload via SIGUSR2.
 */
export async function runGhosttyUpdater(
    themeKey: ThemeKey,
    appConfig: AppConfig,
): Promise<UpdateResult> {
    try {
        const content = await readTextFile(appConfig.config_path);
        const updated = replaceGhosttyTheme(content, themeKey);
        await writeTextFile(appConfig.config_path, updated);

        // Reload ghostty via SIGUSR2. pkill exits non-zero if ghostty isn't running —
        // that's fine, the config file is already updated for next launch.
        const output = await Command.create("exec-sh", ["-c", "pkill -SIGUSR2 ghostty"])
            .execute();
        if (output.code !== 0) {
            console.warn("[ghostty updater] pkill returned non-zero (ghostty may not be running)");
        }

        return { app: "ghostty", status: "done" };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[ghostty updater]", error);
        return { app: "ghostty", status: "error", message };
    }
}
