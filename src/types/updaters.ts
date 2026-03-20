import type { AppName } from "./config.ts";

export type UpdateStatus = "pending" | "running" | "done" | "skipped" | "error";

export interface UpdateResult {
    app: string;
    status: UpdateStatus;
    message?: string;
}

export interface UpdaterEntry {
    app: AppName;
    run: () => Promise<UpdateResult>;
}
