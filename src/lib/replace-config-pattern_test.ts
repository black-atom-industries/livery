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

// --- Tmux patterns ---

Deno.test("replaceConfigPattern replaces tmux source-file line", () => {
    const input = [
        'bind r source-file ~/.config/tmux/tmux.conf \\; display "reloaded!"',
        "source-file ~/repos/black-atom-industries/tmux/themes/terra/black-atom-terra-fall-night.conf",
        "source-file ~/.config/tmux/keymaps.conf",
    ].join("\n");

    const result = replaceConfigPattern({
        content: input,
        matchPattern: "^source-file\\s+.+/themes/.+\\.conf$",
        replaceTemplate: "source-file {themesPath}/{collectionKey}/{themeKey}.conf",
        themeKey: "black-atom-jpn-koyo-hiru",
        collectionKey: "jpn",
        themesPath: "~/repos/black-atom-industries/tmux/themes",
    });

    assertEquals(
        result,
        [
            'bind r source-file ~/.config/tmux/tmux.conf \\; display "reloaded!"',
            "source-file ~/repos/black-atom-industries/tmux/themes/jpn/black-atom-jpn-koyo-hiru.conf",
            "source-file ~/.config/tmux/keymaps.conf",
        ].join("\n"),
    );
});

Deno.test("replaceConfigPattern handles tmux theme with different collection", () => {
    const input = "source-file ~/themes/terra/old-theme.conf";
    const result = replaceConfigPattern({
        content: input,
        matchPattern: "^source-file\\s+.+/themes/.+\\.conf$",
        replaceTemplate: "source-file {themesPath}/{collectionKey}/{themeKey}.conf",
        themeKey: "new-theme",
        collectionKey: "default",
        themesPath: "~/themes",
    });
    assertEquals(result, "source-file ~/themes/default/new-theme.conf");
});

Deno.test("replaceConfigPattern throws if themesPath referenced but not provided", () => {
    assertThrows(
        () =>
            replaceConfigPattern({
                content: "source-file ~/themes/terra/old.conf",
                matchPattern: "^source-file\\s+.+\\.conf$",
                replaceTemplate: "source-file {themesPath}/{collectionKey}/{themeKey}.conf",
                themeKey: "new",
                collectionKey: "terra",
            }),
        Error,
        "themesPath was provided",
    );
});

Deno.test("replaceConfigPattern throws if collectionKey referenced but not provided", () => {
    assertThrows(
        () =>
            replaceConfigPattern({
                content: "source-file ~/themes/terra/old.conf",
                matchPattern: "^source-file\\s+.+\\.conf$",
                replaceTemplate: "source-file {themesPath}/{collectionKey}/{themeKey}.conf",
                themeKey: "new",
                themesPath: "~/themes",
            }),
        Error,
        "collectionKey was provided",
    );
});

// --- Delta patterns ---

Deno.test("replaceConfigPattern replaces delta features with appearance", () => {
    const input = [
        '[delta "black-atom-dark"]',
        "    dark = true",
        "",
        '[delta "black-atom-light"]',
        "    light = true",
        "",
        "[delta]",
        "    features = black-atom-dark",
    ].join("\n");

    const result = replaceConfigPattern({
        content: input,
        matchPattern: "features\\s*=\\s*black-atom-(dark|light)",
        replaceTemplate: "features = black-atom-{appearance}",
        themeKey: "black-atom-terra-spring-day",
        appearance: "light",
    });

    assertEquals(
        result,
        [
            '[delta "black-atom-dark"]',
            "    dark = true",
            "",
            '[delta "black-atom-light"]',
            "    light = true",
            "",
            "[delta]",
            "    features = black-atom-light",
        ].join("\n"),
    );
});

Deno.test("replaceConfigPattern throws if appearance referenced but not provided", () => {
    assertThrows(
        () =>
            replaceConfigPattern({
                content: "features = black-atom-dark",
                matchPattern: "features\\s*=\\s*black-atom-(dark|light)",
                replaceTemplate: "features = black-atom-{appearance}",
                themeKey: "any",
            }),
        Error,
        "appearance was provided",
    );
});
