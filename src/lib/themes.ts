import type { ThemeCollectionKey, ThemeDefinition, ThemeKeyDefinitionMap } from "@black-atom/core";
import { collectionOrder } from "@black-atom/core";

export const COLLECTION_LABELS: Record<ThemeCollectionKey, string> = {
    default: "Default",
    jpn: "JPN",
    terra: "TER",
    stations: "STA",
    mnml: "MNM",
};

/** Get all non-null theme definitions from a theme map. */
export function getThemes(themeMap: ThemeKeyDefinitionMap): ThemeDefinition[] {
    return Object.values(themeMap).filter((d): d is ThemeDefinition => d !== null);
}

export interface ThemeGroup {
    collectionKey: ThemeCollectionKey;
    label: string;
    themes: ThemeDefinition[];
}

/** Group themes by collection in display order. Sorts themes within each group by name. */
export function getGroupedThemes(themeMap: ThemeKeyDefinitionMap): ThemeGroup[] {
    const themes = getThemes(themeMap);

    const grouped = themes.reduce((acc, theme) => {
        const key = theme.meta.collection.key;
        if (!acc.has(key)) acc.set(key, []);
        acc.get(key)!.push(theme);
        return acc;
    }, new Map<ThemeCollectionKey, ThemeDefinition[]>());

    grouped.forEach((group) => group.sort((a, b) => a.meta.name.localeCompare(b.meta.name)));

    return collectionOrder
        .filter((key) => grouped.has(key))
        .map((key) => ({
            collectionKey: key,
            label: COLLECTION_LABELS[key] ?? key,
            themes: grouped.get(key)!,
        }));
}
