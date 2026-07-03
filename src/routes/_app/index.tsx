import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useHotkey, useHotkeySequence } from "@tanstack/react-hotkeys";
import { useStore } from "@tanstack/react-store";
import { themeMap } from "@black-atom/core";
import { appStore } from "../../store/app.ts";
import { commands } from "../../bindings.ts";
import { applyTheme, createUpdaters, getEnabledApps } from "../../lib/updaters.ts";
import { getGroupedThemes } from "../../lib/themes.ts";
import { useConfig } from "../../queries/use-config.ts";
import { ThemeList } from "../../components/theme-list/index.ts";
import { ThemeDetail } from "../../components/theme-detail/index.ts";
import { App } from "../../components/layouts/app.ts";
import { SectionHeader } from "../../components/primitives/section-header/section-header.tsx";
import { Typo } from "../../components/typo/index.ts";

export const Route = createFileRoute("/_app/")({
    component: Component,
});

function Component() {
    const config = useConfig();

    const groups = useMemo(() => getGroupedThemes(themeMap), [themeMap]);
    const themes = useMemo(() => groups.flatMap((g) => g.themes), [groups]);

    const currentTheme = useStore(appStore, (s) => s.currentTheme);
    const phase = useStore(appStore, (s) => s.phase);

    const [pickedIndex, setPickedIndex] = useState(0);
    const pickedEntry = themes[pickedIndex];

    const moveUp = () => setPickedIndex((i) => Math.max(0, i - 1));
    const moveDown = () => setPickedIndex((i) => Math.min(themes.length - 1, i + 1));

    // Arrow keys
    useHotkey("ArrowUp", moveUp);
    useHotkey("ArrowDown", moveDown);

    // Vim navigation
    useHotkey("K", moveUp);
    useHotkey("J", moveDown);
    useHotkeySequence(["G", "G"], () => setPickedIndex(0));
    useHotkey("Shift+G", () => setPickedIndex(themes.length - 1));

    const handleApplyTheme = async () => {
        if (phase === "applying") return;
        if (!config.query.data) return;

        const theme = themes[pickedIndex];
        const enabledApps = getEnabledApps(config.query.data.apps);
        const updaters = createUpdaters(enabledApps, theme.meta);

        if (updaters.length === 0 && !config.query.data.system_appearance) return;

        appStore.setState((s) => ({ ...s, currentTheme: theme, phase: "applying" }));

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
        <App.SplitPanel
            left={
                <>
                    <SectionHeader label="THEMES" />
                    <ThemeList
                        groups={groups}
                        selectedIndex={pickedIndex}
                        onSelect={setPickedIndex}
                    />
                </>
            }
            right={
                <>
                    <SectionHeader label="DETAIL" />
                    <ThemeDetail theme={pickedEntry} />
                    {currentTheme && (
                        <div style={{ marginTop: "var(--lvr-size-6)" }}>
                            <Typo.Small color="positive">
                                Selected: {currentTheme.meta.name}
                            </Typo.Small>
                        </div>
                    )}
                </>
            }
        />
    );
}
