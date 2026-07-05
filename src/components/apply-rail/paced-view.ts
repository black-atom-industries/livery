import type { UpdateResult } from "../../lib/updaters.ts";

const COMPLETED_STATUSES = new Set(["done", "skipped", "error"]);

/** True when the result has left the pending/running phase for real. */
export function isSettledResult(result: UpdateResult): boolean {
    return COMPLETED_STATUSES.has(result.status);
}

/**
 * Display-side pacing of live apply results: rows up to `revealCount` show
 * their real state, the row AT `revealCount` reads as running while its
 * real result waits to be revealed, everything after stays pending. Gives
 * every adapter a perceivable beat even when the real apply is near-instant.
 */
export function pacedView(results: UpdateResult[], revealCount: number): UpdateResult[] {
    if (revealCount >= results.length) return results;

    return results.map((result, index) => {
        if (index < revealCount) return result;
        if (index === revealCount) {
            return isSettledResult(result)
                ? { ...result, status: "running", duration_ms: null }
                : result;
        }
        return { ...result, status: "pending", duration_ms: null };
    });
}
