import { assertEquals, assertThrows } from "@std/assert";
import { replaceConfigPattern } from "./replace-config-pattern.ts";

// --- Ghostty patterns ---

Deno.test("replaceConfigPattern replaces ghostty theme line", () => {
    const input = [
        "# Colors",
        "theme = black-atom-jpn-koyo-hiru.conf",
        "bold-is-bright = false",
    ].join("\n");

    const result = replaceConfigPattern({
        content: input,
        matchPattern: "^theme\\s*=\\s*.+$",
        replaceTemplate: "theme = {themeKey}.conf",
        themeKey: "black-atom-default-dark",
    });

    assertEquals(
        result,
        ["# Colors", "theme = black-atom-default-dark.conf", "bold-is-bright = false"].join("\n"),
    );
});

Deno.test("replaceConfigPattern handles ghostty theme line with spaces", () => {
    const input = "theme =   old-theme.conf\nother = value";
    const result = replaceConfigPattern({
        content: input,
        matchPattern: "^theme\\s*=\\s*.+$",
        replaceTemplate: "theme = {themeKey}.conf",
        themeKey: "new-theme",
    });
    assertEquals(result, "theme = new-theme.conf\nother = value");
});

Deno.test("replaceConfigPattern throws if pattern not found", () => {
    assertThrows(
        () =>
            replaceConfigPattern({
                content: "# No theme line here\nbold-is-bright = false",
                matchPattern: "^theme\\s*=\\s*.+$",
                replaceTemplate: "theme = {themeKey}.conf",
                themeKey: "any",
            }),
        Error,
        "Pattern not found",
    );
});

Deno.test("replaceConfigPattern throws if template missing placeholder", () => {
    assertThrows(
        () =>
            replaceConfigPattern({
                content: "theme = old.conf",
                matchPattern: "^theme\\s*=\\s*.+$",
                replaceTemplate: "theme = hardcoded.conf",
                themeKey: "any",
            }),
        Error,
        "must contain {themeKey}",
    );
});

Deno.test("replaceConfigPattern preserves rest of file", () => {
    const input = ["# Comment", "theme = old.conf", "", "font-size = 14"].join("\n");
    const result = replaceConfigPattern({
        content: input,
        matchPattern: "^theme\\s*=\\s*.+$",
        replaceTemplate: "theme = {themeKey}.conf",
        themeKey: "new",
    });
    const lines = result.split("\n");
    assertEquals(lines[0], "# Comment");
    assertEquals(lines[1], "theme = new.conf");
    assertEquals(lines[2], "");
    assertEquals(lines[3], "font-size = 14");
});

// --- Nvim patterns ---

Deno.test("replaceConfigPattern replaces nvim colorscheme", () => {
    const input = [
        "return {",
        '    colorscheme = "black-atom-terra-fall-night",',
        "    debug = false,",
        "}",
    ].join("\n");

    const result = replaceConfigPattern({
        content: input,
        matchPattern: 'colorscheme\\s*=\\s*"[^"]*"',
        replaceTemplate: 'colorscheme = "{themeKey}"',
        themeKey: "black-atom-jpn-koyo-hiru",
    });

    assertEquals(
        result,
        ["return {", '    colorscheme = "black-atom-jpn-koyo-hiru",', "    debug = false,", "}"]
            .join("\n"),
    );
});

Deno.test("replaceConfigPattern handles nvim colorscheme with spaces", () => {
    const result = replaceConfigPattern({
        content: '    colorscheme  =  "old-theme",',
        matchPattern: 'colorscheme\\s*=\\s*"[^"]*"',
        replaceTemplate: 'colorscheme = "{themeKey}"',
        themeKey: "new-theme",
    });
    assertEquals(result, '    colorscheme = "new-theme",');
});

// --- Generic behavior ---

Deno.test("replaceConfigPattern only replaces first match", () => {
    const result = replaceConfigPattern({
        content: "theme = a.conf\ntheme = b.conf",
        matchPattern: "^theme\\s*=\\s*.+$",
        replaceTemplate: "theme = {themeKey}.conf",
        themeKey: "new",
    });
    assertEquals(result, "theme = new.conf\ntheme = b.conf");
});
