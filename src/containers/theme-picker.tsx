import { useCallback, useEffect, useState } from "react";
import type { ThemeEntry, ThemeGroup } from "../lib/themes.ts";
import { extractShortName } from "../lib/themes.ts";
import { MainLayout } from "../components/layouts/main-layout.tsx";
import { AppHeader } from "../components/app-header.tsx";
import { AppFooter } from "../components/app-footer.tsx";
import { ThemeList } from "../components/theme-list.tsx";
import { ThemeDetail } from "../components/theme-detail.tsx";

interface ThemePickerProps {
    groups: ThemeGroup[];
    themes: ThemeEntry[];
    version: string;
}

export function ThemePicker({ groups, themes, version }: ThemePickerProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedTheme, setSelectedTheme] = useState<ThemeEntry | undefined>(
        undefined,
    );

    const selectedEntry = themes[selectedIndex];

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowUp":
                    e.preventDefault();
                    setSelectedIndex((i) => Math.max(0, i - 1));
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    setSelectedIndex((i) => Math.min(themes.length - 1, i + 1));
                    break;
                case "Enter":
                    e.preventDefault();
                    setSelectedTheme(selectedEntry);
                    break;
            }
        },
        [themes.length, selectedEntry],
    );

    useEffect(() => {
        globalThis.addEventListener("keydown", handleKeyDown);
        return () => globalThis.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

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
