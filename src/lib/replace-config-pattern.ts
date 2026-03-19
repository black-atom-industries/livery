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
 * Throws if {themeKey} is missing, if optional placeholders are referenced but not provided,
 * or if the pattern is not found in the content.
 */
export function replaceConfigPattern(args: ReplaceConfigPatternArgs): string {
    const { content, matchPattern, replaceTemplate, themeKey, collectionKey, themesPath } = args;

    if (!replaceTemplate.includes("{themeKey}")) {
        throw new Error("replace_template must contain {themeKey} placeholder");
    }

    if (replaceTemplate.includes("{collectionKey}") && !collectionKey) {
        throw new Error(
            "replace_template references {collectionKey} but no collectionKey was provided",
        );
    }

    if (replaceTemplate.includes("{themesPath}") && !themesPath) {
        throw new Error("replace_template references {themesPath} but no themesPath was provided");
    }

    const regex = new RegExp(matchPattern, "m");
    const rendered = replaceTemplate
        .replaceAll("{themeKey}", themeKey)
        .replaceAll("{collectionKey}", collectionKey ?? "")
        .replaceAll("{themesPath}", themesPath ?? "");

    if (!regex.test(content)) {
        throw new Error(`Pattern not found: ${matchPattern}`);
    }

    return content.replace(regex, rendered);
}
