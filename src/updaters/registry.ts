import type { ThemeCollectionKey, ThemeKey } from "@black-atom/core";
import type { AppConfig, AppName } from "../types/apps.ts";
import type { UpdateResult } from "../types/updaters.ts";
import { runGhosttyUpdater } from "./ghostty.ts";
import { runNvimUpdater } from "./nvim.ts";

export interface UpdaterContext {
    themeKey: ThemeKey;
    collectionKey: ThemeCollectionKey;
    appConfig: AppConfig;
}

export type AppUpdater = (ctx: UpdaterContext) => Promise<UpdateResult>;

/** Available updaters. Apps without an entry here are skipped during theme application. */
export const updaterRegistry: Partial<Record<AppName, AppUpdater>> = {
    ghostty: runGhosttyUpdater,
    nvim: runNvimUpdater,
};
