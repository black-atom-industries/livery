/**
 * Replace the first match of a regex pattern in content with a rendered template.
 * The template supports {themeKey} placeholder.
 * Throws if the pattern is not found in the content.
 */
export function replaceConfigPattern(
    content: string,
    matchPattern: string,
    replaceTemplate: string,
    themeKey: string,
): string {
    const regex = new RegExp(matchPattern, "m");
    const rendered = replaceTemplate.replace("{themeKey}", themeKey);

    if (!regex.test(content)) {
        throw new Error(`Pattern not found: ${matchPattern}`);
    }

    return content.replace(regex, rendered);
}
