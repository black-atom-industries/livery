import { join } from "@std/path";
import { expandTilde } from "./paths.ts";
import { Config } from "../types/config.ts";
import { DEFAULT_CONFIG } from "../config.ts";

function getConfigPath(): string {
    const home = Deno.env.get("HOME") ?? "";
    return join(home, ".config", "black-atom", "livery", "config.json");
}

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

        tools[name as keyof typeof tools] = {
            config_path: expandTilde(toolConfig.config_path),
            ...(toolConfig.themes_path ? { themes_path: expandTilde(toolConfig.themes_path) } : {}),
        };
    }

    return {
        ...config,
        tools,
    };
}

async function readUserConfig(configPath: string): Promise<Partial<Config>> {
    try {
        const raw = await Deno.readTextFile(configPath);
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

export async function loadConfig({
    configPath = getConfigPath(),
    defaultConfig = DEFAULT_CONFIG,
}: {
    configPath?: string;
    defaultConfig?: Config;
} = {}): Promise<Config> {
    const userConfig = await readUserConfig(configPath);
    return expandToolPaths(mergeConfig(defaultConfig, userConfig));
}
