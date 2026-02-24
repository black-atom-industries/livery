import type { CollectionKey, Definition, Meta, ThemeMap } from "@black-atom/core";

export const COLLECTION_ORDER: CollectionKey[] = ["default", "jpn", "terra", "stations", "mnml"];

export const COLLECTION_LABELS: Record<CollectionKey, string> = {
    default: "Default",
    jpn: "JPN",
    terra: "TER",
    stations: "STA",
    mnml: "MNM",
};

/** Get all non-null theme definitions from a theme map. */
export function getThemes(themeMap: ThemeMap): Definition[] {
    return Object.values(themeMap).filter((d): d is Definition => d !== null);
}

export interface ThemeGroup {
    collectionKey: CollectionKey;
    label: string;
    themes: Definition[];
}

/** Group themes by collection in display order. Sorts themes within each group by short name. */
export function getGroupedThemes(themeMap: ThemeMap): ThemeGroup[] {
    const themes = getThemes(themeMap);

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
