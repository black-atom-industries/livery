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
    tmux: {
        matchPattern: "^source-file\\s+.+/themes/.+\\.conf$",
        replaceTemplate: "source-file {themesPath}/{collectionKey}/{themeKey}.conf",
    },
    delta: {
        matchPattern: "features\\s*=\\s*black-atom-(dark|light)",
        replaceTemplate: "features = black-atom-{appearance}",
    },
};
