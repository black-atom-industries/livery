import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
    component: RootLayout,
});

function RootLayout() {
    return (
        <div className="h-screen flex flex-col bg-neutral-950 text-neutral-100" style={{ fontFamily: "var(--lvr-font-family-body)" }}>
            <Outlet />
        </div>
    );
}
