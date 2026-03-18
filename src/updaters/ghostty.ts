/**
 * Replace the `theme = ...` line in a ghostty config string.
 * Returns the updated config content.
 * Throws if no `theme = ...` line is found.
 */
export function replaceGhosttyTheme(content: string, themeKey: string): string {
    const pattern = /^theme\s*=\s*.+$/m;

    if (!pattern.test(content)) {
        throw new Error("No theme line found in ghostty config");
    }

    // Ghostty theme files use .conf extension (e.g. black-atom-default-dark.conf)
    return content.replace(pattern, `theme = ${themeKey}.conf`);
}
