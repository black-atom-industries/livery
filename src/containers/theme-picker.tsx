import { useState } from "react";
import { useHotkey, useHotkeySequence } from "@tanstack/react-hotkeys";
import type { Definition } from "@black-atom/core";
import type { ThemeGroup } from "../lib/themes.ts";
import { extractShortName } from "../lib/themes.ts";
import { MainLayout } from "../components/layouts/main-layout.tsx";
import { AppHeader } from "../components/app-header.tsx";
import { AppFooter } from "../components/app-footer.tsx";
import { ThemeList } from "../components/theme-list.tsx";
import { ThemeDetail } from "../components/theme-detail.tsx";

interface ThemePickerProps {
    groups: ThemeGroup[];
    themes: Definition[];
    version: string;
}

export function ThemePicker({ groups, themes, version }: ThemePickerProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedTheme, setSelectedTheme] = useState<Definition | undefined>(
        undefined,
    );

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
        setSelectedTheme(selectedEntry);
    });

    return (
        <MainLayout
            header={<AppHeader version={version} />}
            left={
                <ThemeList
                    groups={groups}
                    selectedIndex={selectedIndex}
                    onSelect={setSelectedIndex}
                />
            }
            right={
                <div>
                    <ThemeDetail theme={selectedEntry} />
                    {selectedTheme && (
                        <div className="mt-6 text-sm text-green-400">
                            Selected: {extractShortName(selectedTheme.meta)}
                        </div>
                    )}
                </div>
            }
            footer={<AppFooter />}
        />
    );
}
