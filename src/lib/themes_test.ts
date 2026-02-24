import { assertEquals, assertGreater, assertNotEquals } from "@std/assert";
import type { Meta } from "@black-atom/core";
import { themeBundle } from "@black-atom/core";
import { COLLECTION_ORDER, extractShortName, getGroupedThemes, getThemes } from "./themes.ts";

// --- getThemes ---

Deno.test("getThemes returns non-empty array of full definitions", () => {
    const themes = getThemes(themeBundle);
    assertGreater(themes.length, 0);
    themes.forEach((theme) => {
        assertEquals(typeof theme.meta.key, "string");
        assertEquals(typeof theme.meta.label, "string");
        assertNotEquals(theme.primaries, undefined);
    });
});

// --- getGroupedThemes ---

Deno.test("getGroupedThemes returns groups in COLLECTION_ORDER", () => {
    const groups = getGroupedThemes(themeBundle);
    const keys = groups.map((g) => g.collectionKey);
    assertEquals(keys, COLLECTION_ORDER);
});

Deno.test("getGroupedThemes sorts themes within each group alphabetically", () => {
    const groups = getGroupedThemes(themeBundle);
    groups.forEach((group) => {
        const names = group.themes.map((t) => extractShortName(t.meta));
        const sorted = [...names].sort((a, b) => a.localeCompare(b));
        assertEquals(names, sorted);
    });
});

Deno.test("getGroupedThemes flat count matches getThemes count", () => {
    const grouped = getGroupedThemes(themeBundle);
    const flatCount = grouped.reduce((sum, g) => sum + g.themes.length, 0);
    assertEquals(flatCount, getThemes(themeBundle).length);
});

// --- extractShortName ---

Deno.test("extractShortName handles ∷ separator (collection themes)", () => {
    const meta = { label: "Black Atom — STA ∷ Engineering" } as Meta;
    assertEquals(extractShortName(meta), "Engineering");
});

Deno.test("extractShortName handles — separator (default themes)", () => {
    const meta = { label: "Black Atom — Dark Dimmed" } as Meta;
    assertEquals(extractShortName(meta), "Dark Dimmed");
});
