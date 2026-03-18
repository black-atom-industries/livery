import type { ThemeDefinition } from "@black-atom/core";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { Command } from "@tauri-apps/plugin-shell";
import { appStore } from "../store/app.ts";
import type { Config } from "../types/config.ts";
import type { UpdateResult } from "../types/updaters.ts";
import { replaceGhosttyTheme } from "../updaters/ghostty.ts";

function setResults(results: UpdateResult[]) {
    appStore.setState((s) => ({ ...s, updaterResults: [...results] }));
}

async function runGhosttyUpdater(
    themeKey: string,
    configPath: string,
): Promise<UpdateResult> {
    try {
        const content = await readTextFile(configPath);
        const updated = replaceGhosttyTheme(content, themeKey);
        await writeTextFile(configPath, updated);

        // Reload ghostty via SIGUSR2. pkill exits non-zero if ghostty isn't running —
        // that's fine, the config file is already updated for next launch.
        const output = await Command.create("exec-sh", ["-c", "pkill -SIGUSR2 ghostty"])
            .execute();
        if (output.code !== 0) {
            console.warn("[ghostty updater] pkill returned non-zero (ghostty may not be running)");
        }

        return { tool: "ghostty", status: "done" };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[ghostty updater]", error);
        return { tool: "ghostty", status: "error", message };
    }
}

export async function applyTheme(
    theme: ThemeDefinition,
    config: Config,
): Promise<void> {
    const themeKey = theme.meta.key;

    // Build list of enabled tools that have updaters
    const ghosttyConfig = config.tools.ghostty;
    const hasGhostty = ghosttyConfig?.enabled;

    const results: UpdateResult[] = [];
    if (hasGhostty) {
        results.push({ tool: "ghostty", status: "pending" });
    }

    if (results.length === 0) {
        return; // No enabled tools
    }

    appStore.setState((s) => ({ ...s, phase: "applying" }));
    setResults(results);

    // Run ghostty updater
    if (hasGhostty && ghosttyConfig) {
        const idx = results.findIndex((r) => r.tool === "ghostty");
        results[idx] = { tool: "ghostty", status: "running" };
        setResults(results);

        results[idx] = await runGhosttyUpdater(themeKey, ghosttyConfig.config_path);
        setResults(results);
    }

    appStore.setState((s) => ({ ...s, phase: "done" }));
}
