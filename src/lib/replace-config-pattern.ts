export interface ReplaceConfigPatternArgs {
    content: string;
    matchPattern: string;
    replaceTemplate: string;
    themeKey: string;
    collectionKey?: string;
    themesPath?: string;
}

/**
 * Replace the first match of a regex pattern in content with a rendered template.
 * Supports placeholders: {themeKey}, {collectionKey}, {themesPath}.
 * Throws if the pattern is not found or {themeKey} is missing from template.
 */
export function replaceConfigPattern(args: ReplaceConfigPatternArgs): string {
    const { content, matchPattern, replaceTemplate, themeKey, collectionKey, themesPath } = args;

    if (!replaceTemplate.includes("{themeKey}")) {
        throw new Error("replace_template must contain {themeKey} placeholder");
    }

    const regex = new RegExp(matchPattern, "m");
    const rendered = replaceTemplate
        .replace("{themeKey}", themeKey)
        .replace("{collectionKey}", collectionKey ?? "")
        .replace("{themesPath}", themesPath ?? "");

    if (!regex.test(content)) {
        throw new Error(`Pattern not found: ${matchPattern}`);
    }

    return content.replace(regex, rendered);
}
