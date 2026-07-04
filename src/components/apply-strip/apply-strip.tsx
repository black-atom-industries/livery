import type { AppName } from "../../bindings.ts";
import type { UpdateResult, UpdateStatus } from "../../lib/updaters.ts";
import { getFailedUpdaters, getProgressState } from "../../lib/progress.ts";
import { StatusPip } from "../primitives/status-pip/status-pip.tsx";
import { ProgressBar } from "../primitives/progress-bar/progress-bar.tsx";
import { Button } from "../primitives/button/button.tsx";
import styles from "./apply-strip.module.css";

const PIP_INTENT: Record<UpdateStatus, "pending" | "running" | "ok" | "error" | "off"> = {
    pending: "pending",
    running: "running",
    done: "ok",
    error: "error",
    skipped: "off",
};

interface ApplyStripProps {
    /** Theme name shown in the status line, e.g. "KOYO YORU". */
    themeName: string;
    /** Live updater results driving every row and the aggregate status line. */
    results: UpdateResult[];
    /** Re-runs only the failed updaters. Omit to hide the retry action. */
    onRetryFailed?: () => void;
}

/**
 * Apply-progress strip — one StatusPip per updater, an n/m counter, the
 * ProgressBar, and (on partial failure) an explicit error row with a
 * keyboard-reachable retry action.
 *
 * Spec: docs/design-system/reference/Livery Explorations.dc.html#3c
 */
export function ApplyStrip({ themeName, results, onRetryFailed }: ApplyStripProps) {
    const { completedCount, total, status, totalDurationMs } = getProgressState(results);
    const failedApps = getFailedUpdaters(results);

    const statusLine = status === "done"
        ? `■ APPLIED — ${themeName}`
        : status === "error"
        ? "■ APPLIED WITH ERRORS"
        : `APPLYING ${themeName}`;

    const counterLine = status === "error"
        ? `${completedCount - failedApps.length}/${total} OK · ${failedApps.length} ERROR`
        : status === "done" && totalDurationMs != null
        ? `${completedCount}/${total} OK · ${totalDurationMs} MS`
        : `${completedCount}/${total}`;

    return (
        <div data-component="apply-strip" className={styles.root}>
            <div className={styles.strip}>
                <span className={styles.statusLine} data-status={status}>{statusLine}</span>
                <div className={styles.pips}>
                    {results.map((result) => (
                        <StatusPip key={result.app} intent={PIP_INTENT[result.status]}>
                            {result.app}
                        </StatusPip>
                    ))}
                </div>
                <span className={styles.counter} data-status={status}>{counterLine}</span>
            </div>
            {status !== "error" && <ProgressBar results={results} />}
            {failedApps.map((app) => (
                <ApplyStripError
                    key={app}
                    app={app}
                    message={results.find((r) => r.app === app)?.message}
                    onRetry={onRetryFailed}
                />
            ))}
        </div>
    );
}

interface ApplyStripErrorProps {
    app: AppName;
    message?: string | null;
    onRetry?: () => void;
}

function ApplyStripError({ app, message, onRetry }: ApplyStripErrorProps) {
    return (
        <div className={styles.errorRow}>
            <span className={styles.errorLabel}>{app.toUpperCase()} — FAILED</span>
            <span className={styles.errorMessage}>{message}</span>
            {onRetry && <Button hotkey="r" onClick={onRetry}>RETRY FAILED</Button>}
        </div>
    );
}
