import { assertEquals, assertGreater } from "@std/assert";
import type { Meta } from "@black-atom/core";
import { buildPickerOptions, extractShortName, getThemeEntries } from "./themes.ts";

Deno.test("getThemeEntries returns non-empty array with no nulls", () => {
    const entries = getThemeEntries();
    assertGreater(entries.length, 0);
    for (const entry of entries) {
        assertEquals(typeof entry.key, "string");
        assertEquals(typeof entry.meta.label, "string");
    }
});

Deno.test("extractShortName handles ∷ separator (collection themes)", () => {
    const meta = { label: "Black Atom — STA ∷ Engineering" } as Meta;
    assertEquals(extractShortName(meta), "Engineering");
});

Deno.test("extractShortName handles — separator (default themes)", () => {
    const meta = { label: "Black Atom — Dark Dimmed" } as Meta;
    assertEquals(extractShortName(meta), "Dark Dimmed");
});

Deno.test("buildPickerOptions returns correct count", () => {
    const options = buildPickerOptions();
    const entries = getThemeEntries();
    assertEquals(options.length, entries.length);
});

Deno.test("buildPickerOptions orders Default first and MNM last", () => {
    const options = buildPickerOptions();
    const firstValue = options[0]!.value;
    const lastValue = options[options.length - 1]!.value;

    assertEquals(
        firstValue.includes("default"),
        true,
        `Expected first to be default, got: ${firstValue}`,
    );
    assertEquals(lastValue.includes("mnml"), true, `Expected last to be mnml, got: ${lastValue}`);
});
