import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
    component: SettingsRoute,
});

function SettingsRoute() {
    return (
        <div className="p-6">
            <h2 className="text-lg font-bold">Settings</h2>
            <p className="mt-2 text-sm text-neutral-500">Coming soon.</p>
        </div>
    );
}
