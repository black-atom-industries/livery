import type { AppName } from "../types/apps.ts";

export interface AppPatternDefaults {
    matchPattern: string;
    replaceTemplate: string;
}

export const APP_PATTERN_DEFAULTS: Partial<Record<AppName, AppPatternDefaults>> = {
    ghostty: {
        matchPattern: "^theme\\s*=\\s*.+$",
        replaceTemplate: "theme = {themeKey}.conf",
    },
    nvim: {
        matchPattern: 'colorscheme\\s*=\\s*"[^"]*"',
        replaceTemplate: 'colorscheme = "{themeKey}"',
    },
};
