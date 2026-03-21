import { invoke } from "@tauri-apps/api/core";
import type { ThemeMeta } from "@black-atom/core";
import type { AppConfig, AppName, Config } from "../types/config.ts";
import type { UpdaterEntry, UpdateResult } from "../types/updaters.ts";

/** Filter apps that are enabled in the config. */
export function getEnabledApps(
    apps: Partial<Record<AppName, AppConfig>>,
): [AppName, AppConfig][] {
    return (Object.entries(apps) as [AppName, AppConfig][])
        .filter(([_name, app]) => app.enabled);
}

/** Build runnable updaters from enabled apps, config, and theme metadata. */
export function createUpdaters(
    enabledApps: [AppName, AppConfig][],
    config: Config,
    themeMeta: ThemeMeta,
): UpdaterEntry[] {
    const appUpdaters: UpdaterEntry[] = enabledApps.map(([name]) => ({
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
                const raw = error instanceof Error ? error.message : String(error);
                const message = raw.includes("invalid value")
                    ? `App "${name}" is not recognized by the backend. Is AppName in sync?`
                    : raw;
                return { app: name, status: "error", message };
            }
        },
    }));

    if (config.system_appearance) {
        appUpdaters.push({
            app: "system_appearance",
            run: async (): Promise<UpdateResult> => {
                try {
                    return await invoke<UpdateResult>("update_system_appearance", {
                        appearance: themeMeta.appearance,
                    });
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    return { app: "system_appearance", status: "error", message };
                }
            },
        });
    }

    return appUpdaters;
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
