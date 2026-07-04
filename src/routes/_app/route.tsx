import { useMemo } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { collectionOrder, themeMap } from "@black-atom/core";
import denoConfig from "../../../deno.json" with { type: "json" };
import { AppHeader } from "../../components/app-header/index.ts";
import { AppFooter } from "../../components/app-footer/index.ts";
import { KeyHint } from "../../components/primitives/key-hint/key-hint.tsx";
import { ProgressBar } from "../../components/primitives/progress-bar/progress-bar.tsx";
import { StatusPip } from "../../components/primitives/status-pip/status-pip.tsx";
import { themeToStyleSheet } from "../../lib/tokens.ts";
import { appStore } from "../../store/app.ts";
import styles from "./route.module.css";

export const Route = createFileRoute("/_app")({
    component: AppLayout,
});

function AppLayout() {
    const updaterResults = useStore(appStore, (s) => s.updaterResults);
    const currentTheme = useStore(appStore, (s) => s.currentTheme);

    const themeCount = useMemo(() => Object.keys(themeMap).length, []);
    const collectionCount = collectionOrder.length;
    const env = currentTheme.meta.appearance.toUpperCase();

    return (
        <>
            <style id="black-atom-theme-tokens">{themeToStyleSheet(currentTheme)}</style>
            <div className={styles.root}>
                <header className={styles.header}>
                    <AppHeader
                        version={denoConfig.version}
                        context={`${themeCount} THEMES · ${collectionCount} COLLECTIONS · ENV ${env}`}
                    />
                </header>
                <main className={styles.main}>
                    <Outlet />
                </main>
                <div className={styles.progress}>
                    <ProgressBar results={updaterResults} />
                </div>
                <footer className={styles.footer}>
                    <AppFooter
                        hints={
                            <>
                                <KeyHint keys="j/k">NAVIGATE</KeyHint>
                                <KeyHint keys="/">SEARCH</KeyHint>
                                <KeyHint keys="f">FILTERS</KeyHint>
                                <KeyHint keys="⏎">APPLY</KeyHint>
                                <KeyHint keys="s">SETTINGS</KeyHint>
                                <KeyHint keys="q">QUIT</KeyHint>
                            </>
                        }
                        status={<StatusPip intent="ok">READY</StatusPip>}
                    />
                </footer>
            </div>
        </>
    );
}
