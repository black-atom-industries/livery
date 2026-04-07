import type { ThemeDefinition } from "@black-atom/core";

/**
 * Maps a ThemeDefinition's UI colors to CSS custom property declarations.
 * Components consume these as var(--bg-default), var(--fg-subtle), etc.
 */
export function themeToCustomProperties(theme: ThemeDefinition): Record<string, string> {
    const { ui, primaries } = theme;

    return {
        // Primaries (for borders, dividers, tonal layering)
        "--primary-d10": primaries.d10,
        "--primary-d20": primaries.d20,
        "--primary-d30": primaries.d30,
        "--primary-d40": primaries.d40,
        "--primary-m10": primaries.m10,
        "--primary-m20": primaries.m20,
        "--primary-m30": primaries.m30,
        "--primary-m40": primaries.m40,
        "--primary-l10": primaries.l10,
        "--primary-l20": primaries.l20,
        "--primary-l30": primaries.l30,
        "--primary-l40": primaries.l40,

        // Backgrounds
        "--bg-default": ui.bg.default,
        "--bg-panel": ui.bg.panel,
        "--bg-float": ui.bg.float,
        "--bg-active": ui.bg.active,
        "--bg-hover": ui.bg.hover,
        "--bg-selection": ui.bg.selection,
        "--bg-disabled": ui.bg.disabled,
        "--bg-contrast": ui.bg.contrast,

        // Foregrounds
        "--fg-default": ui.fg.default,
        "--fg-subtle": ui.fg.subtle,
        "--fg-accent": ui.fg.accent,
        "--fg-disabled": ui.fg.disabled,
        "--fg-contrast": ui.fg.contrast,

        // Feedback backgrounds
        "--bg-positive": ui.bg.positive,
        "--bg-negative": ui.bg.negative,
        "--bg-warn": ui.bg.warn,
        "--bg-info": ui.bg.info,

        // Feedback foregrounds
        "--fg-positive": ui.fg.positive,
        "--fg-negative": ui.fg.negative,
        "--fg-warn": ui.fg.warn,
        "--fg-info": ui.fg.info,
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
