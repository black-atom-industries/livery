import { cva } from "cva";
import type { ThemeGroup } from "../lib/themes.ts";
import styles from "./theme-list.module.css";

const itemVariants = cva({
    base: styles.item,
    variants: {
        selected: {
            true: styles.selected,
        },
    },
});

interface ThemeListProps {
    groups: ThemeGroup[];
    selectedIndex: number;
    onSelect: (index: number) => void;
}

export function ThemeList({ groups, selectedIndex, onSelect }: ThemeListProps) {
    let flatIndex = 0;

    return (
        <div data-component="theme-list">
            {groups.map((group) => {
                const items = group.themes.map((entry) => {
                    const index = flatIndex++;
                    const isSelected = index === selectedIndex;
                    const name = entry.meta.name;
                    const icon = entry.meta.appearance === "dark" ? "☾" : "☀";

                    return (
                        <button
                            key={entry.meta.key}
                            ref={isSelected
                                ? (el) => el?.scrollIntoView({ block: "nearest" })
                                : undefined}
                            type="button"
                            onClick={() => onSelect(index)}
                            className={itemVariants({ selected: isSelected })}
                        >
                            {isSelected ? "> " : "  "}
                            {name}
                            <span className={styles.icon}>{icon}</span>
                        </button>
                    );
                });

                return (
                    <div key={group.collectionKey} className={styles.group}>
                        <div className={styles.groupLabel}>
                            {group.label} ({group.themes.length})
                        </div>
                        {items}
                    </div>
                );
            })}
        </div>
    );
}
