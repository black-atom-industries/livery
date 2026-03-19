import { expandTilde } from "./paths.ts";
import { Config } from "../types/config.ts";
import type { AppName } from "../types/config.ts";

export function mergeConfig(base: Config, override: Partial<Config>): Config {
    return {
        system_appearance: override.system_appearance ?? base.system_appearance,
        apps: { ...base.apps, ...override.apps },
    };
}

export function expandAppPaths(config: Config): Config {
    const apps: Config["apps"] = {};

    for (const [name, appConfig] of Object.entries(config.apps)) {
        if (!appConfig) continue;

        apps[name as AppName] = {
            ...appConfig,
            config_path: expandTilde(appConfig.config_path),
            ...(appConfig.themes_path ? { themes_path: expandTilde(appConfig.themes_path) } : {}),
        };
    }

    return {
        ...config,
        apps,
    };
}
