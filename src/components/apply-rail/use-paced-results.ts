import { useEffect, useState } from "react";
import type { AppState } from "../../store/app.ts";
import type { UpdateResult } from "../../lib/updaters.ts";
import { isSettledResult, pacedView } from "./paced-view.ts";

/** Minimum on-screen dwell per adapter row — the rail's scan cadence. */
const STEP_MS = 160;

/**
 * Pace live apply results for display: each row is revealed in sequence
 * with a minimum dwell, so the register scans row by row even when the
 * real apply completes in a few hundred milliseconds. A new pass (phase
 * entering "applying") restarts the scan; outside a pass the results pass
 * straight through.
 */
export function usePacedResults(
    results: UpdateResult[],
    phase: AppState["phase"],
): UpdateResult[] {
    const [revealCount, setRevealCount] = useState(results.length);

    // Restart the scan when a pass starts — adjust-during-render, no effect.
    const [prevPhase, setPrevPhase] = useState(phase);
    if (phase !== prevPhase) {
        setPrevPhase(phase);
        if (phase === "applying") setRevealCount(0);
    }

    const current = results[revealCount];
    const currentSettled = current !== undefined && isSettledResult(current);

    useEffect(() => {
        // Advance only when the row under the reveal cursor has a real,
        // settled result to show — and never faster than the scan cadence.
        if (!currentSettled) return;
        const dwell = setTimeout(() => setRevealCount((count) => count + 1), STEP_MS);
        return () => clearTimeout(dwell);
    }, [revealCount, currentSettled]);

    return pacedView(results, revealCount);
}
