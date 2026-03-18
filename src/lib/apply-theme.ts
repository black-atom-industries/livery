import type { ThemeDefinition } from "@black-atom/core";
import { appStore } from "../store/app.ts";
import type { Config } from "../types/config.ts";
import type { ToolConfig, ToolName } from "../types/tools.ts";
import type { UpdateResult } from "../types/updaters.ts";
import { updaterRegistry } from "../updaters/registry.ts";

function setResults(results: UpdateResult[]) {
    appStore.setState((s) => ({ ...s, updaterResults: [...results] }));
}

export async function applyTheme(
    theme: ThemeDefinition,
    config: Config,
): Promise<void> {
    const themeKey = theme.meta.key;

    // Build list of enabled tools that have a registered updater
    const updaters = (Object.entries(config.tools) as [ToolName, ToolConfig][])
        .filter(([name, tool]) => tool.enabled && updaterRegistry[name])
        .map(([name, tool]) => ({
            tool: name,
            run: () => updaterRegistry[name]!(themeKey, tool),
        }));

    if (updaters.length === 0) {
        return;
    }

    const results: UpdateResult[] = updaters.map<UpdateResult>((u) => ({
        tool: u.tool,
        status: "pending",
    }));

    appStore.setState((s) => ({ ...s, phase: "applying" }));
    setResults(results);

    // Run updaters sequentially
    for (let i = 0; i < updaters.length; i++) {
        results[i] = { tool: updaters[i].tool, status: "running" };
        setResults(results);

        results[i] = await updaters[i].run();
        setResults(results);
    }

    appStore.setState((s) => ({ ...s, phase: "done" }));
}
