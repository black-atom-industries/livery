import { assertEquals, assertGreater, assertNotEquals } from "@std/assert";
import { themeMap } from "@black-atom/core";
import { collectionOrder } from "@black-atom/core";
import { getGroupedThemes, getThemes } from "./themes.ts";

// --- getThemes ---

Deno.test("getThemes returns non-empty array of full definitions", () => {
    const themes = getThemes(themeMap);
    assertGreater(themes.length, 0);
    themes.forEach((theme) => {
        assertEquals(typeof theme.meta.key, "string");
        assertEquals(typeof theme.meta.name, "string");
        assertNotEquals(theme.primaries, undefined);
    });
});

// --- getGroupedThemes ---

Deno.test("getGroupedThemes returns groups in collectionOrder", () => {
    const groups = getGroupedThemes(themeMap);
    const keys = groups.map((g) => g.collectionKey);
    assertEquals(keys, collectionOrder);
});

Deno.test("getGroupedThemes sorts themes within each group alphabetically", () => {
    const groups = getGroupedThemes(themeMap);
    groups.forEach((group) => {
        const names = group.themes.map((t) => t.meta.name);
        const sorted = [...names].sort((a, b) => a.localeCompare(b));
        assertEquals(names, sorted);
    });
});

Deno.test("getGroupedThemes flat count matches getThemes count", () => {
    const grouped = getGroupedThemes(themeMap);
    const flatCount = grouped.reduce((sum, g) => sum + g.themes.length, 0);
    assertEquals(flatCount, getThemes(themeMap).length);
});
