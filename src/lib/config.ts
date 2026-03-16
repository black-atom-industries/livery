import { expandTilde } from "./paths.ts";
import { Config } from "../types/config.ts";
import type { ToolName } from "../types/tools.ts";

export function mergeConfig(base: Config, override: Partial<Config>): Config {
    return {
        system_appearance: override.system_appearance ?? base.system_appearance,
        tools: { ...base.tools, ...override.tools },
    };
}

export function expandToolPaths(config: Config): Config {
    const tools: Config["tools"] = {};

    for (const [name, toolConfig] of Object.entries(config.tools)) {
        if (!toolConfig) continue;

        tools[name as ToolName] = {
            ...toolConfig,
            config_path: expandTilde(toolConfig.config_path),
            ...(toolConfig.themes_path
                ? { themes_path: expandTilde(toolConfig.themes_path) }
                : {}),
        };
    }

    return {
        ...config,
        tools,
    };
}
