import type { CollectionKey, Definition, Key, Meta } from "@black-atom/core";
import { themeBundle } from "@black-atom/core";

export const COLLECTION_ORDER: CollectionKey[] = ["default", "jpn", "terra", "stations", "mnml"];

export const COLLECTION_LABELS: Record<CollectionKey, string> = {
    default: "Default",
    jpn: "JPN",
    terra: "TER",
    stations: "STA",
    mnml: "MNM",
};

/** Look up a single theme by key. Returns null for missing/unfinished themes. */
export function getTheme(key: Key): Definition | null {
    return themeBundle[key];
}

/** Get all non-null theme definitions. */
export function getThemes(): Definition[] {
    return Object.values(themeBundle).filter((d): d is Definition => d !== null);
}

export interface ThemeGroup {
    collectionKey: CollectionKey;
    label: string;
    themes: Definition[];
}

/** Group themes by collection in display order. Sorts themes within each group by short name. */
export function getGroupedThemes(): ThemeGroup[] {
    const themes = getThemes();

    const grouped = themes.reduce((acc, theme) => {
        const key = theme.meta.collection.key;
        if (!acc.has(key)) acc.set(key, []);
        acc.get(key)!.push(theme);
        return acc;
    }, new Map<CollectionKey, Definition[]>());

    grouped.forEach((group) =>
        group.sort((a, b) => extractShortName(a.meta).localeCompare(extractShortName(b.meta)))
    );

    return COLLECTION_ORDER
        .filter((key) => grouped.has(key))
        .map((key) => ({
            collectionKey: key,
            label: COLLECTION_LABELS[key] ?? key,
            themes: grouped.get(key)!,
        }));
}

/**
 * Extract short theme name from meta.label.
 *
 * Labels come in two formats:
 * - "Black Atom — Dark"                → "Dark"
 * - "Black Atom — STA ∷ Engineering"   → "Engineering"
 *
 * TODO: Replace with meta.name once core adds it (DEV-283)
 */
export function extractShortName(meta: Meta): string {
    const label = meta.label;

    const delimIdx = label.indexOf("∷");
    if (delimIdx !== -1) return label.slice(delimIdx + 1).trim();

    const dashIdx = label.indexOf("—");
    if (dashIdx !== -1) return label.slice(dashIdx + 1).trim();

    return label;
}
