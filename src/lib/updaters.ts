import { invoke } from "@tauri-apps/api/core";
import type { ThemeMeta } from "@black-atom/core";
import type { AppConfig, AppName } from "../types/config.ts";
import type { UpdaterEntry, UpdateResult } from "../types/updaters.ts";

/** Filter apps that are enabled in the config. */
export function getEnabledApps(
    apps: Partial<Record<AppName, AppConfig>>,
): [AppName, AppConfig][] {
    return (Object.entries(apps) as [AppName, AppConfig][])
        .filter(([_name, app]) => app.enabled);
}

/** Build runnable updaters from enabled apps and theme metadata. */
export function createUpdaters(
    enabledApps: [AppName, AppConfig][],
    themeMeta: ThemeMeta,
): UpdaterEntry[] {
    return enabledApps.map(([name]) => ({
        app: name,
        run: async (): Promise<UpdateResult> => {
            try {
                return await invoke<UpdateResult>("update_app", {
                    app: name,
                    themeKey: themeMeta.key,
                    appearance: themeMeta.appearance,
                    collectionKey: themeMeta.collection.key,
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return { app: name, status: "error", message };
            }
        },
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
