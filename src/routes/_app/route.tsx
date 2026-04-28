import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import denoConfig from "../../../deno.json" with { type: "json" };
import { AppHeader } from "../../components/app-header.tsx";
import { AppFooter } from "../../components/app-footer.tsx";
import { ProgressBar } from "../../components/progress-bar.tsx";
import { themeToStyleSheet } from "../../lib/tokens.ts";
import { appStore } from "../../store/app.ts";

export const Route = createFileRoute("/_app")({
    component: AppLayout,
});

function AppLayout() {
    const updaterResults = useStore(appStore, (s) => s.updaterResults);
    const currentTheme = useStore(appStore, (s) => s.currentTheme);

    return (
        <>
            <style id="black-atom-theme-tokens">{themeToStyleSheet(currentTheme)}</style>

            <header className="shrink-0 px-6 py-4 border-b border-neutral-800">
                <AppHeader version={denoConfig.version} />
            </header>

            <main className="flex-1 min-h-0">
                <Outlet />
            </main>

            <div className="shrink-0 px-6 py-2 border-t border-neutral-800">
                <ProgressBar results={updaterResults} />
            </div>

            <footer className="shrink-0 px-6 py-2 border-t border-neutral-800 text-xs text-neutral-500">
                <AppFooter />
            </footer>
        </>
    );
}
