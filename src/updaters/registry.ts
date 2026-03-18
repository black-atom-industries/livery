import type { ThemeKey } from "@black-atom/core";
import type { ToolConfig, ToolName } from "../types/tools.ts";
import type { UpdateResult } from "../types/updaters.ts";
import { runGhosttyUpdater } from "./ghostty.ts";

export type ToolUpdater = (themeKey: ThemeKey, toolConfig: ToolConfig) => Promise<UpdateResult>;

/** Available updaters. Tools without an entry here are skipped during theme application. */
export const updaterRegistry: Partial<Record<ToolName, ToolUpdater>> = {
    ghostty: runGhosttyUpdater,
};
