import { assertEquals, assertThrows } from "@std/assert";
import { replaceGhosttyTheme } from "./ghostty.ts";

Deno.test("replaceGhosttyTheme replaces theme line", () => {
    const input = [
        "# Colors",
        "theme = black-atom-jpn-koyo-hiru.conf",
        "bold-is-bright = false",
    ].join("\n");

    const result = replaceGhosttyTheme(input, "black-atom-default-dark");
    assertEquals(
        result,
        [
            "# Colors",
            "theme = black-atom-default-dark.conf",
            "bold-is-bright = false",
        ].join("\n"),
    );
});

Deno.test("replaceGhosttyTheme handles theme line with spaces", () => {
    const input = "theme =   old-theme.conf\nother = value";
    const result = replaceGhosttyTheme(input, "new-theme");
    assertEquals(result, "theme = new-theme.conf\nother = value");
});

Deno.test("replaceGhosttyTheme throws if no theme line found", () => {
    const input = "# No theme line here\nbold-is-bright = false";
    assertThrows(
        () => replaceGhosttyTheme(input, "any-theme"),
        Error,
        "No theme line found",
    );
});

Deno.test("replaceGhosttyTheme preserves rest of file", () => {
    const input = [
        "# Comment",
        "theme = old.conf",
        "",
        "font-size = 14",
        "font-family = TX-02",
    ].join("\n");

    const result = replaceGhosttyTheme(input, "new-theme");
    const lines = result.split("\n");
    assertEquals(lines[0], "# Comment");
    assertEquals(lines[1], "theme = new-theme.conf");
    assertEquals(lines[2], "");
    assertEquals(lines[3], "font-size = 14");
    assertEquals(lines[4], "font-family = TX-02");
});
