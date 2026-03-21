import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useHotkey, useHotkeySequence } from "@tanstack/react-hotkeys";
import { useStore } from "@tanstack/react-store";
import { themeMap } from "@black-atom/core";
import { appStore } from "../store/app.ts";
import { commands } from "../bindings.ts";
import { applyTheme, createUpdaters, getEnabledApps } from "../lib/updaters.ts";
import { getGroupedThemes } from "../lib/themes.ts";
import { useConfig } from "../queries/use-config.ts";
import { ThemeList } from "../components/theme-list.tsx";
import { ThemeDetail } from "../components/theme-detail.tsx";

export const Route = createFileRoute("/")({
    component: Component,
});

function Component() {
    const config = useConfig();

    const groups = useMemo(() => getGroupedThemes(themeMap), [themeMap]);
    const themes = useMemo(() => groups.flatMap((g) => g.themes), [groups]);

    const selectedTheme = useStore(appStore, (s) => s.selectedTheme);
    const phase = useStore(appStore, (s) => s.phase);

    const [selectedIndex, setSelectedIndex] = useState(0);
    const selectedEntry = themes[selectedIndex];

    const moveUp = () => setSelectedIndex((i) => Math.max(0, i - 1));
    const moveDown = () => setSelectedIndex((i) => Math.min(themes.length - 1, i + 1));

    // Arrow keys
    useHotkey("ArrowUp", moveUp);
    useHotkey("ArrowDown", moveDown);

    // Vim navigation
    useHotkey("K", moveUp);
    useHotkey("J", moveDown);
    useHotkeySequence(["G", "G"], () => setSelectedIndex(0));
    useHotkey("Shift+G", () => setSelectedIndex(themes.length - 1));

    const handleApplyTheme = async () => {
        if (phase === "applying") return;
        if (!config.query.data) return;

        const theme = themes[selectedIndex];
        const enabledApps = getEnabledApps(config.query.data.apps);
        const updaters = createUpdaters(enabledApps, theme.meta);

        if (updaters.length === 0 && !config.query.data.system_appearance) return;

        appStore.setState((s) => ({ ...s, selectedTheme: theme, phase: "applying" }));

        try {
            await applyTheme(updaters, (results) => {
                appStore.setState((s) => ({ ...s, updaterResults: results }));
            });

            if (config.query.data.system_appearance) {
                try {
                    await commands.updateSystemAppearance(theme.meta.appearance);
                } catch (error) {
                    console.warn("[system appearance]", error);
                }
            }
        } finally {
            appStore.setState((s) => ({ ...s, phase: "done" }));
        }
    };

    useHotkey("Enter", handleApplyTheme);

    return (
        <div className="flex h-full">
            <div className="w-1/2 overflow-y-auto border-r border-neutral-800 px-4 py-3">
                <ThemeList
                    groups={groups}
                    selectedIndex={selectedIndex}
                    onSelect={setSelectedIndex}
                />
            </div>
            <div className="w-1/2 overflow-y-auto px-6 py-3">
                <ThemeDetail theme={selectedEntry} />
                {selectedTheme && (
                    <div className="mt-6 text-sm text-green-400">
                        Selected: {selectedTheme.meta.name}
                    </div>
                )}
            </div>
        </div>
    );
}
