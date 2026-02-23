// TODO: Remove aliases after core renames land (DEV-279)
import type { Key as ThemeKey, Meta as ThemeMeta } from "@black-atom/core";
import { Config } from "./config.ts";

export type UpdateStatus = "pending" | "running" | "done" | "skipped" | "error";

export interface UpdateResult {
    tool: string;
    status: UpdateStatus;
    message?: string;
}

export interface Updater {
    name: string;
    label: string;
    apply(args: {
        themeKey: ThemeKey;
        theme: ThemeMeta;
        config: Config;
    }): Promise<UpdateResult>;
}
