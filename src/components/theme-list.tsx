import type { ThemeGroup } from "../lib/themes.ts";
import { extractShortName } from "../lib/themes.ts";

interface ThemeListProps {
    groups: ThemeGroup[];
    selectedIndex: number;
    onSelect: (index: number) => void;
}

export function ThemeList({ groups, selectedIndex, onSelect }: ThemeListProps) {
    let flatIndex = 0;

    return (
        <div>
            {groups.map((group) => {
                const items = group.themes.map((entry) => {
                    const index = flatIndex++;
                    const isSelected = index === selectedIndex;
                    const name = extractShortName(entry.meta);
                    const icon = entry.meta.appearance === "dark" ? "☾" : "☀";

                    return (
                        <button
                            key={entry.meta.key}
                            ref={isSelected
                                ? (el) => el?.scrollIntoView({ block: "nearest" })
                                : undefined}
                            type="button"
                            onClick={() => onSelect(index)}
                            className={`block w-full text-left px-3 py-1 text-sm cursor-pointer ${
                                isSelected
                                    ? "bg-neutral-800 text-neutral-100"
                                    : "text-neutral-400 hover:text-neutral-200"
                            }`}
                        >
                            {isSelected ? "> " : "  "}
                            {name}
                            <span className="ml-2 text-neutral-600">{icon}</span>
                        </button>
                    );
                });

                return (
                    <div key={group.collectionKey} className="mb-2">
                        <div className="px-3 py-1 text-xs text-neutral-600 uppercase tracking-wider">
                            {group.label} ({group.themes.length})
                        </div>
                        {items}
                    </div>
                );
            })}
        </div>
    );
}
