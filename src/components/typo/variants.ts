import type { ThemeUiColors } from "@black-atom/core";

type ThemeUiFgColor = keyof ThemeUiColors["fg"];

export const typoColors = [
    "default",
    "subtle",
    "accent",
    "contrast",
    "disabled",
    "positive",
    "negative",
    "warn",
    "info",
    "hint",
] satisfies ThemeUiFgColor[];

export type TypoColor = typeof typoColors[number];

export const typoFonts = ["heading", "body", "mono"] as const;
export type TypoFont = typeof typoFonts[number];

export const fontVariants: Record<TypoFont, string> = {
    heading: "Typo--font-heading",
    body: "Typo--font-body",
    mono: "Typo--font-mono",
};

export const colorVariants: Record<TypoColor, string> = {
    default: "Typo--color-default",
    subtle: "Typo--color-subtle",
    accent: "Typo--color-accent",
    contrast: "Typo--color-contrast",
    disabled: "Typo--color-disabled",
    positive: "Typo--color-positive",
    negative: "Typo--color-negative",
    warn: "Typo--color-warn",
    info: "Typo--color-info",
    hint: "Typo--color-neutral",
};
