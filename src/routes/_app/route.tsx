import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import denoConfig from "../../../deno.json" with { type: "json" };
import { AppHeader } from "../../components/app-header/index.ts";
import { AppFooter } from "../../components/app-footer/index.ts";
import { ProgressBar } from "../../components/progress-bar/index.ts";
import { themeToStyleSheet } from "../../lib/tokens.ts";
import { appStore } from "../../store/app.ts";
import styles from "./route.module.css";

export const Route = createFileRoute("/_app")({
    component: AppLayout,
});

function AppLayout() {
    const updaterResults = useStore(appStore, (s) => s.updaterResults);
    const currentTheme = useStore(appStore, (s) => s.currentTheme);

    return (
        <>
            <style id="black-atom-theme-tokens">{themeToStyleSheet(currentTheme)}</style>
            <div className={styles.root}>
                <header className={styles.header}>
                    <AppHeader version={denoConfig.version} />
                </header>
                <main className={styles.main}>
                    <Outlet />
                </main>
                <div className={styles.progress}>
                    <ProgressBar results={updaterResults} />
                </div>
                <footer className={styles.footer}>
                    <AppFooter />
                </footer>
            </div>
        </>
    );
}
