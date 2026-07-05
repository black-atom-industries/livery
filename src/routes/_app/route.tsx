import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useStore } from "@tanstack/react-store";
import { useMutationState } from "@tanstack/react-query";
import { collectionOrder, themeMap } from "@black-atom/core";
import denoConfig from "../../../deno.json" with { type: "json" };
import type { AppName } from "../../bindings.ts";
import { AppHeader } from "../../components/app-header/index.ts";
import { AppFooter } from "../../components/app-footer/index.ts";
import { ApplyRail } from "../../components/apply-rail/index.ts";
import { Button } from "../../components/primitives/button/button.tsx";
import { KeyHint } from "../../components/primitives/key-hint/key-hint.tsx";
import { StatusPip } from "../../components/primitives/status-pip/status-pip.tsx";
import { themeToStyleSheet } from "../../lib/tokens.ts";
import { getFailedUpdaters, mergeUpdateResults, summarizeApply } from "../../lib/progress.ts";
import { applyTheme, createUpdaters, getEnabledApps } from "../../lib/updaters.ts";
import { useConfig } from "../../queries/use-config.ts";
import { appStore } from "../../store/app.ts";
import styles from "./route.module.css";

export const Route = createFileRoute("/_app")({
    component: AppLayout,
});

function AppLayout() {
    const config = useConfig();
    const phase = useStore(appStore, (s) => s.phase);
    const updaterResults = useStore(appStore, (s) => s.updaterResults);
    const currentTheme = useStore(appStore, (s) => s.currentTheme);

    const matches = useMatches();
    const settingsMatch = matches.find((m) => m.routeId === "/_app/settings");
    const isSettings = settingsMatch !== undefined;
    const settingsSection = (settingsMatch?.search as { section?: string } | undefined)?.section ??
        "adapters";

    // Save mutation lives on the settings route's own useConfig() instance —
    // useMutationState reads the shared MutationCache by key instead of
    // threading mutation state up through props.
    const saveMutationStatuses = useMutationState({
        filters: { mutationKey: ["config", "save"] },
        select: (mutation) => mutation.state.status,
    });
    const latestSaveStatus = saveMutationStatuses.at(-1);
    const isSaving = latestSaveStatus === "pending";
    const justSaved = latestSaveStatus === "success";

    const themeCount = useMemo(() => Object.keys(themeMap).length, []);
    const collectionCount = collectionOrder.length;
    const env = currentTheme.meta.appearance.toUpperCase();

    const summary = summarizeApply(updaterResults);
    const railOpen = phase !== "picking" && updaterResults.length > 0;
    const railKeysActive = railOpen && !isSettings;

    // Rail cursor + expansion. The cursor follows the running row, then the
    // first fault, until j/k takes over; a new apply pass resets both.
    const [manualCursor, setManualCursor] = useState<number | null>(null);
    const [expandedApp, setExpandedApp] = useState<AppName | null>(null);
    const [prevPhase, setPrevPhase] = useState(phase);
    if (phase !== prevPhase) {
        setPrevPhase(phase);
        if (phase === "applying") {
            setManualCursor(null);
            setExpandedApp(null);
        }
    }

    const runningIndex = updaterResults.findIndex((r) => r.status === "running");
    const firstFaultIndex = updaterResults.findIndex(
        (r) => r.status === "error" || (r.status === "skipped" && r.message),
    );
    const cursorIndex = manualCursor ?? (runningIndex !== -1 ? runningIndex : firstFaultIndex);
    const cursorResult = cursorIndex >= 0 ? updaterResults[cursorIndex] : undefined;

    const moveRailCursor = (delta: number) => {
        if (updaterResults.length === 0) return;
        const from = cursorIndex >= 0 ? cursorIndex : delta > 0 ? -1 : updaterResults.length;
        setManualCursor(Math.max(0, Math.min(updaterResults.length - 1, from + delta)));
    };

    const toggleCursoredRow = (app?: AppName) => {
        const target = app ?? (cursorResult?.status === "error" ? cursorResult.app : undefined);
        if (!target) return;
        setExpandedApp((current) => (current === target ? null : target));
    };

    const dismissRail = () => appStore.setState((s) => ({ ...s, phase: "picking" }));
    const reopenRail = () => appStore.setState((s) => ({ ...s, phase: "done" }));

    // Clean success holds the ■ APPLIED beat, then dismisses itself —
    // nothing to acknowledge. Faults never leave on a timer.
    useEffect(() => {
        if (phase !== "done" || summary.kind !== "clean") return;
        const beat = setTimeout(dismissRail, 1200);
        return () => clearTimeout(beat);
    }, [phase, summary.kind]);

    const handleRetryFailed = async () => {
        if (!config.query.data) return;

        const failedApps = getFailedUpdaters(updaterResults);
        if (failedApps.length === 0) return;

        const enabledApps = getEnabledApps(config.query.data.apps)
            .filter(([name]) => failedApps.includes(name));
        const retryUpdaters = createUpdaters(enabledApps, currentTheme.meta);

        appStore.setState((s) => ({
            ...s,
            phase: "applying",
            updaterResults: mergeUpdateResults(
                s.updaterResults,
                retryUpdaters.map((u) => ({ app: u.app, status: "pending", duration_ms: null })),
            ),
        }));

        try {
            await applyTheme(retryUpdaters, (partial) => {
                appStore.setState((s) => ({
                    ...s,
                    updaterResults: mergeUpdateResults(s.updaterResults, partial),
                }));
            });
        } finally {
            appStore.setState((s) => ({ ...s, phase: "done" }));
        }
    };

    useHotkey("R", handleRetryFailed);
    useHotkey("J", () => railKeysActive && moveRailCursor(1));
    useHotkey("K", () => railKeysActive && moveRailCursor(-1));
    useHotkey("Enter", () => railKeysActive && toggleCursoredRow());
    useHotkey("Escape", () => railKeysActive && phase !== "applying" && dismissRail());

    // After dismissal the last result lives on as a footer pip; a fault pip
    // carries [ a REOPEN RAIL ].
    const lastResultVisible = phase === "picking" && updaterResults.length > 0 && !isSettings;
    const lastResultFaulted = summary.kind === "error" || summary.kind === "degraded";
    useHotkey("A", () => lastResultVisible && lastResultFaulted && reopenRail());

    const themeName = currentTheme.meta.name.toUpperCase();

    const resultPip = summary.kind === "clean"
        ? (
            <StatusPip intent="ok">
                APPLIED — {themeName} · {summary.okCount}/{summary.total}
                {summary.totalDurationMs != null ? ` · ${summary.totalDurationMs}MS` : ""}
            </StatusPip>
        )
        : (
            <span className={styles.faultPip}>
                <StatusPip intent={summary.errorCount > 0 ? "error" : "warn"}>
                    {summary.total - summary.errorCount}/{summary.total} APPLIED ·{" "}
                    {summary.errorCount > 0
                        ? `${summary.errorCount} ERROR`
                        : `${summary.degradedCount} DEGRADED`}
                </StatusPip>
                <Button hotkey="a" intent="ghost" onClick={reopenRail}>REOPEN RAIL</Button>
            </span>
        );

    return (
        <>
            <style id="black-atom-theme-tokens">{themeToStyleSheet(currentTheme)}</style>
            <div className={styles.root}>
                <header className={styles.header}>
                    <AppHeader
                        version={denoConfig.version}
                        context={isSettings
                            ? `SETTINGS / ${settingsSection.toUpperCase()}`
                            : `${themeCount} THEMES · ${collectionCount} COLLECTIONS · ENV ${env}`}
                    />
                </header>
                <main className={styles.main}>
                    <div className={styles.content}>
                        <Outlet />
                    </div>
                    <aside className={styles.rail} data-open={railOpen}>
                        {updaterResults.length > 0 && (
                            <ApplyRail
                                themeName={themeName}
                                results={updaterResults}
                                cursorApp={cursorResult?.app ?? null}
                                expandedApp={expandedApp}
                                onToggleRow={toggleCursoredRow}
                                onRetryFailed={handleRetryFailed}
                            />
                        )}
                    </aside>
                </main>
                <footer className={styles.footer}>
                    <AppFooter
                        hints={isSettings
                            ? (
                                <>
                                    <KeyHint keys="j/k">ROWS</KeyHint>
                                    <KeyHint keys="space">TOGGLE</KeyHint>
                                    <KeyHint keys="⏎">EXPAND</KeyHint>
                                    <KeyHint keys="e">EDIT FIELD</KeyHint>
                                    <KeyHint keys="esc">BACK</KeyHint>
                                </>
                            )
                            : (
                                <>
                                    <KeyHint keys="j/k">NAVIGATE</KeyHint>
                                    <KeyHint keys="/">SEARCH</KeyHint>
                                    <KeyHint keys="f">FILTERS</KeyHint>
                                    <KeyHint keys="⏎">APPLY</KeyHint>
                                    <KeyHint keys="s">SETTINGS</KeyHint>
                                    <KeyHint keys="q">QUIT</KeyHint>
                                </>
                            )}
                        status={isSettings && isSaving
                            ? <StatusPip intent="running">SAVING…</StatusPip>
                            : isSettings && justSaved
                            ? <StatusPip intent="ok">SAVED</StatusPip>
                            : lastResultVisible
                            ? resultPip
                            : <StatusPip intent="ok">READY</StatusPip>}
                    />
                </footer>
            </div>
        </>
    );
}
