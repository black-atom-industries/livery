import type { ThemeCollectionKey, ThemeKey, ThemeMeta } from "@black-atom/core";
import type { AppConfig, AppName } from "../types/config.ts";
import type { UpdateResult } from "../types/updaters.ts";
import { runDeltaUpdater } from "./delta.ts";
import { runGhosttyUpdater } from "./ghostty.ts";
import { runLazygitUpdater } from "./lazygit.ts";
import { runNvimUpdater } from "./nvim.ts";
import { runTmuxUpdater } from "./tmux.ts";

export interface UpdaterContext {
    themeKey: ThemeKey;
    appearance: ThemeMeta["appearance"];
    collectionKey: ThemeCollectionKey;
    appConfig: AppConfig;
}

export type AppUpdater = (ctx: UpdaterContext) => Promise<UpdateResult>;

/** Available updaters. Apps without an entry here are skipped during theme application. */
export const updaterRegistry: Partial<Record<AppName, AppUpdater>> = {
    ghostty: runGhosttyUpdater,
    nvim: runNvimUpdater,
    tmux: runTmuxUpdater,
    delta: runDeltaUpdater,
    lazygit: runLazygitUpdater,
};
