import { useMemo } from "react";
import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useStore } from "@tanstack/react-store";
import { useMutationState } from "@tanstack/react-query";
import { collectionOrder, themeMap } from "@black-atom/core";
import denoConfig from "../../../deno.json" with { type: "json" };
import { AppHeader } from "../../components/app-header/index.ts";
import { AppFooter } from "../../components/app-footer/index.ts";
import { ApplyStrip } from "../../components/apply-strip/index.ts";
import { KeyHint } from "../../components/primitives/key-hint/key-hint.tsx";
import { StatusPip } from "../../components/primitives/status-pip/status-pip.tsx";
import { themeToStyleSheet } from "../../lib/tokens.ts";
import { getFailedUpdaters, mergeUpdateResults } from "../../lib/progress.ts";
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

    const showApplyStrip = phase !== "picking" && updaterResults.length > 0;

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
                    <Outlet />
                </main>
                {showApplyStrip && (
                    <div className={styles.progress}>
                        <ApplyStrip
                            themeName={currentTheme.meta.name.toUpperCase()}
                            results={updaterResults}
                            onRetryFailed={handleRetryFailed}
                        />
                    </div>
                )}
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
                            : <StatusPip intent="ok">READY</StatusPip>}
                    />
                </footer>
            </div>
        </>
    );
}
