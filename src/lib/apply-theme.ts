import type { ThemeDefinition } from "@black-atom/core";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { Command } from "@tauri-apps/plugin-shell";
import { appStore } from "../store/app.ts";
import type { UpdateResult } from "../types/updaters.ts";
import { replaceGhosttyTheme } from "../updaters/ghostty.ts";
import { expandTilde } from "./paths.ts";

/** Hardcoded config for initial development. Will be replaced by proper config loading. */
const GHOSTTY_CONFIG_PATH = "~/.config/ghostty/config";

function setResults(results: UpdateResult[]) {
    appStore.setState((s) => ({ ...s, updaterResults: [...results] }));
}

async function runGhosttyUpdater(themeKey: string): Promise<UpdateResult> {
    const configPath = expandTilde(GHOSTTY_CONFIG_PATH);

    try {
        const content = await readTextFile(configPath);
        const updated = replaceGhosttyTheme(content, themeKey);
        await writeTextFile(configPath, updated);

        // Reload ghostty via SIGUSR2
        await Command.create("exec-sh", ["-c", "pkill -SIGUSR2 ghostty"])
            .execute();

        return { tool: "ghostty", status: "done" };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { tool: "ghostty", status: "error", message };
    }
}

export async function applyTheme(theme: ThemeDefinition): Promise<void> {
    const themeKey = theme.meta.key;
    const results: UpdateResult[] = [{ tool: "ghostty", status: "pending" }];

    appStore.setState((s) => ({ ...s, phase: "applying" }));
    setResults(results);

    // Mark as running
    results[0] = { tool: "ghostty", status: "running" };
    setResults(results);

    // Run the updater
    results[0] = await runGhosttyUpdater(themeKey);
    setResults(results);

    appStore.setState((s) => ({ ...s, phase: "done" }));
}
