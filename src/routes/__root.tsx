import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import denoConfig from "../../deno.json" with { type: "json" };
import { AppHeader } from "../components/app-header.tsx";
import { AppFooter } from "../components/app-footer.tsx";

export const Route = createRootRoute({
    component: RootLayout,
});

function RootLayout() {
    return (
        <div className="h-screen flex flex-col bg-neutral-950 text-neutral-100 font-mono">
            <header className="shrink-0 px-6 py-4 border-b border-neutral-800">
                <AppHeader version={denoConfig.version} />
            </header>

            <main className="flex-1 min-h-0">
                <Outlet />
            </main>

            <footer className="shrink-0 px-6 py-2 border-t border-neutral-800 text-xs text-neutral-500">
                <AppFooter />
            </footer>

            <TanStackRouterDevtools position="bottom-right" />
        </div>
    );
}
