import type { ThemeDefinition } from "@black-atom/core";
import { appStore } from "../store/app.ts";
import type { Config } from "../types/config.ts";
import type { AppConfig, AppName } from "../types/apps.ts";
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

    // Build list of enabled apps that have a registered updater
    const updaters = (Object.entries(config.apps) as [AppName, AppConfig][])
        .filter(([name, app]) => app.enabled && updaterRegistry[name])
        .map(([name, app]) => ({
            app: name,
            run: () => updaterRegistry[name]!(themeKey, app),
        }));

    if (updaters.length === 0) {
        return;
    }

    const results: UpdateResult[] = updaters.map<UpdateResult>((u) => ({
        app: u.app,
        status: "pending",
    }));

    appStore.setState((s) => ({ ...s, phase: "applying" }));
    setResults(results);

    // Run updaters sequentially
    for (let i = 0; i < updaters.length; i++) {
        results[i] = { app: updaters[i].app, status: "running" };
        setResults(results);

        results[i] = await updaters[i].run();
        setResults(results);
    }

    appStore.setState((s) => ({ ...s, phase: "done" }));
}
