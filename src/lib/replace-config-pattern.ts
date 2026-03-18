export interface ReplaceConfigPatternArgs {
    content: string;
    matchPattern: string;
    replaceTemplate: string;
    themeKey: string;
}

/**
 * Replace the first match of a regex pattern in content with a rendered template.
 * The template supports {themeKey} placeholder.
 * Throws if the pattern is not found or the template is missing {themeKey}.
 */
export function replaceConfigPattern(args: ReplaceConfigPatternArgs): string {
    const { content, matchPattern, replaceTemplate, themeKey } = args;

    if (!replaceTemplate.includes("{themeKey}")) {
        throw new Error("replace_template must contain {themeKey} placeholder");
    }

    const regex = new RegExp(matchPattern, "m");
    const rendered = replaceTemplate.replace("{themeKey}", themeKey);

    if (!regex.test(content)) {
        throw new Error(`Pattern not found: ${matchPattern}`);
    }

    return content.replace(regex, rendered);
}
