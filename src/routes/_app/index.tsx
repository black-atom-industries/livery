import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useHotkey, useHotkeySequence } from "@tanstack/react-hotkeys";
import { useStore } from "@tanstack/react-store";
import { collectionOrder, type ThemeCollectionKey, themeMap } from "@black-atom/core";
import { appStore } from "../../store/app.ts";
import { commands } from "../../bindings.ts";
import { applyTheme, createUpdaters, getEnabledApps } from "../../lib/updaters.ts";
import { getGroupedThemes } from "../../lib/themes.ts";
import { useConfig } from "../../queries/use-config.ts";
import { ThemeList } from "../../components/theme-list/index.ts";
import { ThemeDetail } from "../../components/theme-detail/index.ts";
import { App } from "../../components/layouts/app.ts";
import { Prompt } from "../../components/primitives/prompt/prompt.tsx";
import { Chip } from "../../components/primitives/chip/chip.tsx";
import { EmptyState } from "../../components/empty-state/index.ts";
import styles from "./index.module.css";

export const Route = createFileRoute("/_app/")({
    component: Component,
});

type AppearanceFilter = "all" | "dark" | "light";

function Component() {
    const config = useConfig();
    const navigate = useNavigate();

    const allGroups = useMemo(() => getGroupedThemes(themeMap), []);
    const allThemes = useMemo(() => allGroups.flatMap((g) => g.themes), [allGroups]);

    const currentTheme = useStore(appStore, (s) => s.currentTheme);
    const phase = useStore(appStore, (s) => s.phase);

    const [query, setQuery] = useState("");
    const [collectionFilter, setCollectionFilter] = useState<ThemeCollectionKey | "all">("all");
    const [appearanceFilter, setAppearanceFilter] = useState<AppearanceFilter>("all");

    const groups = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return allGroups
            .filter((group) =>
                collectionFilter === "all" || group.collectionKey === collectionFilter
            )
            .map((group) => ({
                ...group,
                themes: group.themes.filter((theme) => {
                    const matchesQuery = normalizedQuery === "" ||
                        theme.meta.name.toLowerCase().includes(normalizedQuery);
                    const matchesAppearance = appearanceFilter === "all" ||
                        theme.meta.appearance === appearanceFilter;
                    return matchesQuery && matchesAppearance;
                }),
            }))
            .filter((group) => group.themes.length > 0);
    }, [allGroups, query, collectionFilter, appearanceFilter]);

    const themes = useMemo(() => groups.flatMap((g) => g.themes), [groups]);

    const [pickedIndex, setPickedIndex] = useState(0);
    const clampedIndex = Math.min(pickedIndex, Math.max(0, themes.length - 1));
    const pickedEntry = themes[clampedIndex];

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
        if (!pickedEntry) return;

        const enabledApps = getEnabledApps(config.query.data.apps);
        const updaters = createUpdaters(enabledApps, pickedEntry.meta);

        if (updaters.length === 0 && !config.query.data.system_appearance) return;

        appStore.setState((s) => ({ ...s, currentTheme: pickedEntry, phase: "applying" }));

        try {
            await applyTheme(updaters, (results) => {
                appStore.setState((s) => ({ ...s, updaterResults: results }));
            });

            if (config.query.data.system_appearance) {
                try {
                    await commands.updateSystemAppearance(pickedEntry.meta.appearance);
                } catch (error) {
                    console.warn("[system appearance]", error);
                }
            }
        } finally {
            appStore.setState((s) => ({ ...s, phase: "done" }));
        }
    };

    useHotkey("Enter", handleApplyTheme);

    const configSettled = !config.query.isPending;
    const hasNoAdapters = configSettled &&
        (config.query.isError || config.enabledApps.length === 0);

    if (hasNoAdapters) {
        return (
            <EmptyState
                eyebrow={`${allThemes.length} THEMES INDEXED · 0 APPLIED`}
                headline="PICK A LIVERY, PAINT THE COCKPIT"
                body="Select any theme with j/k and press ⏎ — Livery repaints every enabled tool in one pass. Nothing is written until you apply. No adapters are enabled yet — check settings."
                onOpenSettings={() => navigate({ to: "/settings" })}
            />
        );
    }

    return (
        <App.SplitPanel
            left={
                <>
                    <div className={styles.prompt}>
                        <Prompt
                            value={query}
                            onChange={(value) => {
                                setQuery(value);
                                setPickedIndex(0);
                            }}
                            count={`${themes.length}/${allThemes.length}`}
                        />
                    </div>
                    <div className={styles.chips}>
                        <div className={styles.chipGroup}>
                            <Chip
                                active={collectionFilter === "all"}
                                onClick={() => setCollectionFilter("all")}
                            >
                                ALL
                            </Chip>
                            {collectionOrder.map((key) => (
                                <Chip
                                    key={key}
                                    active={collectionFilter === key}
                                    onClick={() => setCollectionFilter(key)}
                                >
                                    {key.toUpperCase()}
                                </Chip>
                            ))}
                        </div>
                        <span className={styles.chipDivider} />
                        <div className={styles.chipGroup}>
                            <Chip
                                active={appearanceFilter === "all"}
                                onClick={() => setAppearanceFilter("all")}
                            >
                                ◐ ALL
                            </Chip>
                            <Chip
                                active={appearanceFilter === "dark"}
                                onClick={() => setAppearanceFilter("dark")}
                            >
                                ● DARK
                            </Chip>
                            <Chip
                                active={appearanceFilter === "light"}
                                onClick={() => setAppearanceFilter("light")}
                            >
                                ○ LIGHT
                            </Chip>
                        </div>
                    </div>
                    <ThemeList
                        groups={groups}
                        selectedIndex={clampedIndex}
                        onSelect={setPickedIndex}
                    />
                </>
            }
            right={
                <ThemeDetail
                    theme={pickedEntry}
                    isActive={pickedEntry?.meta.key === currentTheme.meta.key}
                />
            }
        />
    );
}
