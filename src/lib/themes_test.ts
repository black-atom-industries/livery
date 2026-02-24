import { assertEquals, assertGreater, assertNotEquals } from "@std/assert";
import type { Meta } from "@black-atom/core";
import {
    COLLECTION_ORDER,
    extractShortName,
    getGroupedThemes,
    getTheme,
    getThemes,
} from "./themes.ts";

// --- getTheme ---

Deno.test("getTheme returns a definition for a valid key", () => {
    const theme = getTheme("black-atom-default-dark");
    assertNotEquals(theme, null);
    assertEquals(theme!.meta.key, "black-atom-default-dark");
});

Deno.test("getTheme returns definition with primaries, palette, ui, and syntax", () => {
    const theme = getTheme("black-atom-default-dark")!;
    assertNotEquals(theme.primaries, undefined);
    assertNotEquals(theme.palette, undefined);
    assertNotEquals(theme.ui, undefined);
    assertNotEquals(theme.syntax, undefined);
});

// --- getThemes ---

Deno.test("getThemes returns non-empty array of full definitions", () => {
    const themes = getThemes();
    assertGreater(themes.length, 0);
    themes.forEach((theme) => {
        assertEquals(typeof theme.meta.key, "string");
        assertEquals(typeof theme.meta.label, "string");
        assertNotEquals(theme.primaries, undefined);
    });
});

// --- getGroupedThemes ---

Deno.test("getGroupedThemes returns groups in COLLECTION_ORDER", () => {
    const groups = getGroupedThemes();
    const keys = groups.map((g) => g.collectionKey);
    assertEquals(keys, COLLECTION_ORDER);
});

Deno.test("getGroupedThemes sorts themes within each group alphabetically", () => {
    const groups = getGroupedThemes();
    groups.forEach((group) => {
        const names = group.themes.map((t) => extractShortName(t.meta));
        const sorted = [...names].sort((a, b) => a.localeCompare(b));
        assertEquals(names, sorted);
    });
});

Deno.test("getGroupedThemes flat count matches getThemes count", () => {
    const grouped = getGroupedThemes();
    const flatCount = grouped.reduce((sum, g) => sum + g.themes.length, 0);
    assertEquals(flatCount, getThemes().length);
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
