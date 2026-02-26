import { assertEquals, assertGreater } from "@std/assert";
import { themeMap } from "@black-atom/core";
import { collectionOrder } from "@black-atom/core";
import { getGroupedThemes } from "./themes.ts";

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

Deno.test("getGroupedThemes uses collection label from theme meta", () => {
    const groups = getGroupedThemes(themeMap);
    groups.forEach((group) => {
        assertEquals(group.label, group.themes[0].meta.collection.label);
    });
});

Deno.test("getGroupedThemes includes all themes from themeMap", () => {
    const grouped = getGroupedThemes(themeMap);
    const flatCount = grouped.reduce((sum, g) => sum + g.themes.length, 0);
    const totalThemes = Object.values(themeMap).filter(Boolean).length;
    assertGreater(flatCount, 0);
    assertEquals(flatCount, totalThemes);
});
