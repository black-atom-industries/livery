import type { AppName } from "../types/config.ts";

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
    // Delta uses a separate include file (~/.gitconfig.delta) managed by livery.
    // The file contains [delta "black-atom-dark"], [delta "black-atom-light"] feature blocks
    // and the active features line. The main .gitconfig has [include] path = ~/.gitconfig.delta.
    delta: {
        matchPattern: "features\\s*=\\s*black-atom-(dark|light)",
        replaceTemplate: "features = black-atom-{appearance}",
    },
};
