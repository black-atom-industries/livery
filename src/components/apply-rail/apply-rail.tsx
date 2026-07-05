import type { UpdateResult } from "../../lib/updaters.ts";
import { summarizeApply } from "../../lib/progress.ts";
import {
    type AdapterRowStatus,
    AdapterStatusRow,
} from "../primitives/adapter-status-row/adapter-status-row.tsx";
import styles from "./apply-rail.module.css";

/**
 * UpdateResult → row status. A skip carrying a message is a degraded result
 * (e.g. "config patched, live reload failed") — it must read as attention,
 * never as silence. A bare skip stays quiet.
 */
export function toAdapterRowStatus(result: UpdateResult): AdapterRowStatus {
    switch (result.status) {
        case "done":
            return "ok";
        case "skipped":
            return result.message ? "warn" : "ok";
        case "error":
            return "error";
        case "pending":
            return "pending";
        case "running":
            return "running";
    }
}

interface ApplyRailProps {
    /** Theme name shown in the register line, e.g. "KOYO YORU". */
    themeName: string;
    /** Live updater results, in run order — one AdapterStatusRow each. */
    results: UpdateResult[];
    /** App under the j/k cursor, or null for no cursor. */
    cursorApp?: UpdateResult["app"] | null;
    /** Error row currently expanded in place, or null. */
    expandedApp?: UpdateResult["app"] | null;
    /** ⏎ / click on an error row. */
    onToggleRow?: (app: UpdateResult["app"]) => void;
    /** Re-runs only the failed updaters. Omit to hide the retry action. */
    onRetryFailed?: () => void;
}

/**
 * Apply Rail — right-docked vertical apply status, the ApplyStrip's
 * successor. Register header (status line + n/m + total ms + 3px track),
 * one AdapterStatusRow per updater in run order, and the rail's key
 * vocabulary as its footer. Clean success auto-dismisses after a ~1.2s
 * beat; error/degraded persists until esc — a fault needs a decision.
 *
 * Purely presentational: cursor, expansion, hotkeys and dismissal live
 * in the app-layout container.
 *
 * Spec: docs/design-system/reference/Livery Explorations.dc.html#3f
 */
export function ApplyRail({
    themeName,
    results,
    cursorApp,
    expandedApp,
    onToggleRow,
    onRetryFailed,
}: ApplyRailProps) {
    const summary = summarizeApply(results);
    const { kind, okCount, errorCount, degradedCount, completedCount, total, totalDurationMs } =
        summary;

    const statusLine = kind === "running"
        ? `APPLYING ${themeName}`
        : kind === "clean"
        ? `■ APPLIED — ${themeName}`
        : kind === "degraded"
        ? `■ APPLIED · ${degradedCount} DEGRADED`
        : "■ APPLIED WITH ERRORS";

    const counterLeft = kind === "running"
        ? `${completedCount}/${total}`
        : `${okCount + degradedCount}/${total} OK`;

    const counterRight = kind === "error"
        ? `${errorCount} ERROR`
        : totalDurationMs != null
        ? `${totalDurationMs} MS`
        : "";

    const progressValue = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    const vocabulary = kind === "clean"
        ? "esc DISMISS · auto in 1.2s"
        : `j/k ROWS · ⏎ ${expandedApp ? "COLLAPSE" : "DETAILS"} · r RETRY · esc DISMISS`;

    return (
        <div data-component="apply-rail" data-kind={kind} className={styles.root}>
            <div className={styles.header}>
                <span className={styles.statusLine}>{statusLine}</span>
                <div className={styles.counters}>
                    <span>{counterLeft}</span>
                    <span>{counterRight}</span>
                </div>
                {/* A fault header carries no track — the counter is the verdict. */}
                {kind !== "error" && (
                    <div className={styles.track}>
                        <div className={styles.fill} style={{ width: `${progressValue}%` }} />
                    </div>
                )}
            </div>
            <div className={styles.rows}>
                {results.map((result) => (
                    <AdapterStatusRow
                        key={result.app}
                        name={result.app}
                        status={toAdapterRowStatus(result)}
                        durationMs={result.duration_ms}
                        message={result.message}
                        cursored={cursorApp === result.app}
                        expanded={expandedApp === result.app}
                        onToggle={onToggleRow ? () => onToggleRow(result.app) : undefined}
                        onRetry={onRetryFailed}
                    />
                ))}
            </div>
            <div className={styles.vocabulary}>{vocabulary}</div>
        </div>
    );
}
