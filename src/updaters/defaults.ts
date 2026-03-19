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
    // Delta uses a separate include file (~/.gitconfig.delta).
    // Users must create this file with [delta "black-atom-dark"] and [delta "black-atom-light"]
    // feature blocks, and add [include] path = ~/.gitconfig.delta to their .gitconfig.
    // Livery only updates the `features = ...` line — it does not create or bootstrap the file.
    delta: {
        matchPattern: "features\\s*=\\s*black-atom-(dark|light)",
        replaceTemplate: "features = black-atom-{appearance}",
    },
};
