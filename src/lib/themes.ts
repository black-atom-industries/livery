import {
    collectionOrder,
    type ThemeCollectionKey,
    type ThemeDefinition,
    type ThemeKeyDefinitionMap,
} from "@black-atom/core";

export interface ThemeGroup {
    collectionKey: ThemeCollectionKey;
    label: string;
    themes: ThemeDefinition[];
}

/** Group themes by collection in display order. Sorts themes within each group by name. */
export function getGroupedThemes(themeMap: ThemeKeyDefinitionMap): ThemeGroup[] {
    const themes = Object.values(themeMap).filter((d): d is ThemeDefinition => d !== null);

    const grouped = themes.reduce((acc, theme) => {
        const key = theme.meta.collection.key;
        if (!acc.has(key)) acc.set(key, []);
        acc.get(key)!.push(theme);
        return acc;
    }, new Map<ThemeCollectionKey, ThemeDefinition[]>());

    grouped.forEach((group) => group.sort((a, b) => a.meta.name.localeCompare(b.meta.name)));

    return collectionOrder
        .filter((key) => grouped.has(key))
        .map((key) => {
            const themes = grouped.get(key)!;
            return {
                collectionKey: key,
                label: themes[0].meta.collection.label,
                themes,
            };
        });
}
