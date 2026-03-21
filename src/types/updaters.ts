import type { AppName } from "./config.ts";

export type UpdateStatus = "pending" | "running" | "done" | "skipped" | "error";

export interface UpdateResult {
    app: string;
    status: UpdateStatus;
    message?: string;
}

export type UpdaterAppName = AppName | "system_appearance";

export interface UpdaterEntry {
    app: UpdaterAppName;
    run: () => Promise<UpdateResult>;
}
