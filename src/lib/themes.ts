import type { CollectionKey, Key, Meta } from "@black-atom/core";
import { themeBundle } from "@black-atom/core";

export interface ThemeEntry {
    key: Key;
    meta: Meta;
}

export const COLLECTION_ORDER: CollectionKey[] = ["default", "jpn", "terra", "stations", "mnml"];

export const COLLECTION_LABELS: Record<CollectionKey, string> = {
    default: "Default",
    jpn: "JPN",
    terra: "TER",
    stations: "STA",
    mnml: "MNM",
};

const APPEARANCE_ICON: Record<string, string> = {
    dark: "☾",
    light: "☀",
};

/** Iterate themeBundle, filter nulls, return typed entries. */
export function getThemeEntries(): ThemeEntry[] {
    const entries: ThemeEntry[] = [];
    for (const [_key, definition] of Object.entries(themeBundle)) {
        if (definition === null) continue;
        entries.push({ key: definition.meta.key, meta: definition.meta });
    }
    return entries;
}

/**
 * Extract short theme name from meta.label.
 *
 * Labels come in two formats:
 * - "Black Atom — Dark"         → "Dark"
 * - "Black Atom — STA ∷ Engineering" → "Engineering"
 *
 * TODO: Replace with meta.name once core adds it (DEV-283)
 */
export function extractShortName(meta: Meta): string {
    const label = meta.label;

    // Try "∷" separator first (collection themes)
    const delimIdx = label.indexOf("∷");
    if (delimIdx !== -1) {
        return label.slice(delimIdx + 1).trim();
    }

    // Fall back to "—" separator (default themes)
    const dashIdx = label.indexOf("—");
    if (dashIdx !== -1) {
        return label.slice(dashIdx + 1).trim();
    }

    return label;
}

/** Format a single picker label with aligned columns. */
export function formatPickerLabel(meta: Meta, collectionWidth: number): string {
    const collection = COLLECTION_LABELS[meta.collection.key] ?? meta.collection.key;
    const name = extractShortName(meta);
    const icon = APPEARANCE_ICON[meta.appearance] ?? "";
    return `${collection.padEnd(collectionWidth)}  ${name}  ${icon}`;
}

export interface PickerOption {
    label: string;
    value: string;
}

/** Full pipeline: entries → group by collection → sort → flatten → map to picker options. */
export function buildPickerOptions(): PickerOption[] {
    const entries = getThemeEntries();

    // Group by collection key
    const groups = new Map<CollectionKey, ThemeEntry[]>();
    for (const entry of entries) {
        const key = entry.meta.collection.key;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(entry);
    }

    // Sort within each group alphabetically by short name
    for (const group of groups.values()) {
        group.sort((a, b) => extractShortName(a.meta).localeCompare(extractShortName(b.meta)));
    }

    // Determine max collection label width for alignment
    const collectionWidth = Math.max(
        ...COLLECTION_ORDER.map((k) => (COLLECTION_LABELS[k] ?? k).length),
    );

    // Flatten in collection order
    const options: PickerOption[] = [];
    for (const collectionKey of COLLECTION_ORDER) {
        const group = groups.get(collectionKey);
        if (!group) continue;
        for (const entry of group) {
            options.push({
                label: formatPickerLabel(entry.meta, collectionWidth),
                value: entry.key,
            });
        }
    }

    return options;
}

export interface ThemeGroup {
    collectionKey: CollectionKey;
    label: string;
    themes: ThemeEntry[];
}

/** Group themes by collection in display order. Sorts themes within each group by short name. */
export function getGroupedThemes(): ThemeGroup[] {
    const entries = getThemeEntries();

    const groups = new Map<CollectionKey, ThemeEntry[]>();
    for (const entry of entries) {
        const key = entry.meta.collection.key;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(entry);
    }

    for (const group of groups.values()) {
        group.sort((a, b) => extractShortName(a.meta).localeCompare(extractShortName(b.meta)));
    }

    return COLLECTION_ORDER
        .filter((key) => groups.has(key))
        .map((key) => ({
            collectionKey: key,
            label: COLLECTION_LABELS[key] ?? key,
            themes: groups.get(key)!,
        }));
}
