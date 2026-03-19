import type { ThemeCollectionKey, ThemeKey } from "@black-atom/core";
import type { AppConfig, AppName } from "../types/apps.ts";
import type { UpdateResult } from "../types/updaters.ts";
import { updaterRegistry } from "../updaters/registry.ts";

export interface UpdaterEntry {
    app: AppName;
    run: () => Promise<UpdateResult>;
}

/** Build the list of updaters for enabled apps that have a registered updater. */
export function getEnabledUpdaters(
    themeKey: ThemeKey,
    collectionKey: ThemeCollectionKey,
    apps: Partial<Record<AppName, AppConfig>>,
): UpdaterEntry[] {
    return (Object.entries(apps) as [AppName, AppConfig][])
        .filter(([name, app]) => app.enabled && updaterRegistry[name])
        .map(([name, appConfig]) => ({
            app: name,
            run: () => updaterRegistry[name]!({ themeKey, collectionKey, appConfig }),
        }));
}

/** Run updaters sequentially, calling onUpdate after each status change. */
export async function applyTheme(
    updaters: UpdaterEntry[],
    onUpdate: (results: UpdateResult[]) => void,
): Promise<void> {
    const results: UpdateResult[] = updaters.map<UpdateResult>((u) => ({
        app: u.app,
        status: "pending",
    }));

    onUpdate(results);

    for (let i = 0; i < updaters.length; i++) {
        results[i] = { app: updaters[i].app, status: "running" };
        onUpdate([...results]);

        results[i] = await updaters[i].run();
        onUpdate([...results]);
    }
}
