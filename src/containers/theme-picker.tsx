import { useMemo, useState } from "react";
import { useHotkey, useHotkeySequence } from "@tanstack/react-hotkeys";
import { useStore } from "@tanstack/react-store";
import type { ThemeKeyDefinitionMap } from "@black-atom/core";
import { appStore } from "../store/app.ts";
import { getGroupedThemes } from "../lib/themes.ts";
import { ThemeList } from "../components/theme-list.tsx";
import { ThemeDetail } from "../components/theme-detail.tsx";

interface ThemePickerProps {
    themeMap: ThemeKeyDefinitionMap;
}

export function ThemePicker({ themeMap }: ThemePickerProps) {
    const groups = useMemo(() => getGroupedThemes(themeMap), [themeMap]);
    const themes = useMemo(() => groups.flatMap((g) => g.themes), [groups]);

    const selectedTheme = useStore(appStore, (s) => s.selectedTheme);

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

    useHotkey("Enter", () => {
        appStore.setState((s) => ({ ...s, selectedTheme: selectedEntry }));
    });

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
