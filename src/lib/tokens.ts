import type { ThemeDefinition } from "@black-atom/core";

/**
 * Maps a ThemeDefinition's UI colors to CSS custom property declarations.
 * Components consume these as var(--bg-default), var(--fg-subtle), etc.
 */
export function themeToCustomProperties(theme: ThemeDefinition): Record<string, string> {
    return {
        // Backgrounds
        "--bg-default": theme.ui.bg.default,
        "--bg-panel": theme.ui.bg.panel,
        "--bg-float": theme.ui.bg.float,
        "--bg-active": theme.ui.bg.active,
        "--bg-hover": theme.ui.bg.hover,
        "--bg-selection": theme.ui.bg.selection,
        "--bg-disabled": theme.ui.bg.disabled,
        "--bg-contrast": theme.ui.bg.contrast,
        "--bg-positive": theme.ui.bg.positive,
        "--bg-negative": theme.ui.bg.negative,
        "--bg-warn": theme.ui.bg.warn,
        "--bg-info": theme.ui.bg.info,

        // Foregrounds
        "--fg-default": theme.ui.fg.default,
        "--fg-subtle": theme.ui.fg.subtle,
        "--fg-accent": theme.ui.fg.accent,
        "--fg-contrast": theme.ui.fg.contrast,
        "--fg-disabled": theme.ui.fg.disabled,
        "--fg-positive": theme.ui.fg.positive,
        "--fg-negative": theme.ui.fg.negative,
        "--fg-warn": theme.ui.fg.warn,
        "--fg-info": theme.ui.fg.info,
        "--fg-hint": theme.ui.fg.hint,
    };
}

/** Generates a :root CSS block string from theme tokens. */
export function themeToStyleSheet(theme: ThemeDefinition): string {
    const properties = themeToCustomProperties(theme);
    const declarations = Object.entries(properties)
        .map(([prop, value]) => `    ${prop}: ${value};`)
        .join("\n");

    return `:root {\n${declarations}\n}`;
}
