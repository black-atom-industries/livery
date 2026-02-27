import type { UpdateResult } from "../types/updaters.ts";

export type ProgressStatus = "idle" | "running" | "done" | "error";

export interface ProgressState {
    completedCount: number;
    total: number;
    /** 0-100 percentage, or null when there are no results (indeterminate). */
    value: number | null;
    /** Name of the currently running tool, or null if none running. */
    currentLabel: string | null;
    /** Aggregate status: idle (no results), running, done, or error. */
    status: ProgressStatus;
}

const COMPLETED_STATUSES = new Set(["done", "skipped", "error"]);

export function getProgressState(results: UpdateResult[]): ProgressState {
    if (results.length === 0) {
        return {
            completedCount: 0,
            total: 0,
            value: null,
            currentLabel: null,
            status: "idle",
        };
    }

    const total = results.length;
    const completedCount = results.filter((r) => COMPLETED_STATUSES.has(r.status)).length;
    const value = Math.round((completedCount / total) * 100);
    const running = results.find((r) => r.status === "running");
    const hasError = results.some((r) => r.status === "error");

    let status: ProgressStatus;
    if (running) {
        status = "running";
    } else if (completedCount === total && hasError) {
        status = "error";
    } else if (completedCount === total) {
        status = "done";
    } else {
        status = "running";
    }

    return {
        completedCount,
        total,
        value,
        currentLabel: running?.tool ?? null,
        status,
    };
}
