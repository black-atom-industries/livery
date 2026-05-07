import type { ThemeDefinition } from "@black-atom/core";

/**
 * Maps a ThemeDefinition's UI colors to CSS custom property declarations.
 * Components consume these as var(--lvr-color-bg-default), var(--lvr-color-fg-default), etc.
 */
export function themeToCustomProperties(theme: ThemeDefinition): Record<string, string> {
    return {
        // Backgrounds
        "--lvr-color-bg-default": theme.ui.bg.default,
        "--lvr-color-bg-subtle": theme.ui.bg.panel,
        "--lvr-color-bg-hint": theme.ui.bg.float,
        "--lvr-color-bg-accent": theme.ui.bg.active,
        "--lvr-color-bg-contrast": theme.ui.bg.contrast,
        "--lvr-color-bg-disabled": theme.ui.bg.disabled,
        "--lvr-color-bg-positive": theme.ui.bg.positive,
        "--lvr-color-bg-negative": theme.ui.bg.negative,
        "--lvr-color-bg-warn": theme.ui.bg.warn,
        "--lvr-color-bg-info": theme.ui.bg.info,

        // Foregrounds
        "--lvr-color-fg-default": theme.ui.fg.default,
        "--lvr-color-fg-subtle": theme.ui.fg.subtle,
        "--lvr-color-fg-hint": theme.ui.fg.hint,
        "--lvr-color-fg-accent": theme.ui.fg.accent,
        "--lvr-color-fg-contrast": theme.ui.fg.contrast,
        "--lvr-color-fg-disabled": theme.ui.fg.disabled,
        "--lvr-color-fg-positive": theme.ui.fg.positive,
        "--lvr-color-fg-negative": theme.ui.fg.negative,
        "--lvr-color-fg-warn": theme.ui.fg.warn,
        "--lvr-color-fg-info": theme.ui.fg.info,
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
