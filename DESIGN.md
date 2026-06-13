# Livery UI Design Language

## Summary

Design language and screen specifications for Black Atom Livery — a theme management desktop app
(Tauri v2). The visual identity draws from technical documentation, industrial datasheets, and
vintage space-program aesthetics. The app serves as a "vault terminal" for browsing and deploying
color themes across developer tools.

## Design DNA

### Aesthetic References

- DHARMA Initiative (Lost) — mysterious corporate identity, vintage badges
- NASA 1970s identity — Futura mixed with technical type, worm/meatball duality
- Berkeley Mono specimen — box-drawing diagrams, hatched shadows, RFC-style schematics
- The existing black-atom.industries website — bordered sections, monospace, datasheet layout

### Typography — Three Voices

- **Display (Space Grotesk Bold):** Headlines, theme names, step numbers, page titles. Tight
  tracking, uppercase or title case. Provides institutional authority and visual weight. Used
  sparingly — the exception, not the default.
- **Body (TBD — IBM Plex Sans or Geist):** Descriptions, documentation, multi-sentence content.
  Relaxed leading, max 65ch width. Neutral and readable for sustained reading.
- **Mono (JetBrains Mono / Berkeley Mono):** ALL labels, navigation, status text, section headers,
  form fields, metadata, keyboard shortcuts. Uppercase with letterspacing for section headers. This
  is the default voice of the interface — anything that is part of the chrome uses monospace.
  Berkeley Mono (TX-02) is the visual target, but its license prohibits app bundling and
  redistribution (EULA §1.14, §9). Licensing inquiry pending (black-atom-industries/ui#5). JetBrains
  Mono is the fallback. IoskeleyMono (SIL OFL) is an open-source Berkeley Mono approximation worth
  evaluating.

**Hierarchy through contrast:** Pair massive display headlines with tiny monospace metadata labels
to create the "technical datasheet" effect.

### Color System

- **Chrome is monochrome.** Dark warm grays on dark mode, warm off-whites on light mode.
- **Accent colors:** Muted green for synced/active indicators. Optionally muted purple for
  selection/focus states.
- **Themes are the color.** Palette swatches and previews bring color. Chrome never competes.
- **Light mode:** Paper-like warmth to backgrounds (not pure white, not olive/yellow). Warm cream
  inspired by aged cotton paper. The `terra-fall` theme family in `@black-atom/core` (hue ~50) is
  the closest tonal reference. The `default` family (hue 240) is too cool.
- **Dark mode:** Deep teal-tinted charcoal (not pure black). The `default-dark` tokens (hue 195)
  work well here.
- **All colors import from `@black-atom/core` via JSR** at implementation time — no hardcoded hex
  values in components.

### Surfaces & Borders

- Bordered panels with visible 1px solid edges — the datasheet box aesthetic.
- No rounded corners (or minimal, 2px max). Squared-off is more technical.
- Subtle hatched/dotted patterns as decorative texture on non-interactive surfaces.
- Box-drawing-inspired dividers and separators where appropriate.

### Recurring Motifs

- **The dot/circle:** Logo mark (a literal black dot = black atom), wordmark "o" replacement, bullet
  indicators.
- **Uppercase mono labels** with horizontal rules underneath (website section header pattern).
- **Bordered boxes** as the primary container pattern.

### Design Register Split

- **Setup Wizard & Settings:** Fully technical/datasheet. Pure utility.
- **Main View:** Hybrid — technical chrome on the side panels, more atmospheric and spacious in the
  center specimen area where themes are displayed.

## Component Patterns

Reusable patterns extracted from screen designs. These map to the component architecture: Dumb
Components own styling, Containers/Routes own data, Partials compose without styling, Layouts handle
structural arrangement.

### Buttons — "Actuator" Style

```
[ PRIMARY_ACTION ]     — Filled contrast background, inverse text, mono uppercase
[ SECONDARY_ACTION ]   — 1px border, transparent fill, mono uppercase
[ DISABLED ]           — Muted fill, reduced opacity text
```

Bracket notation `[ LABEL ]` is the visual signature for interactive elements. No rounded corners.
No glows. No gradients.

### Status Indicators

Square pip (not circle) + monospace label. Three states:

- Green pip + "SYNCED" / "VALID" / "ACTIVE"
- Purple pip + "SELECTED" / "FOCUSED" (if a second accent is added)
- Gray pip + "INACTIVE" / "DISABLED"

### Section Headers

Uppercase monospace label with horizontal rule underneath. Optional metadata right-aligned on the
same line. This is the primary structural pattern — borrowed from the website.

### Data Panels / Cards

1px border, squared corners. Uppercase mono header with rule. Key-value content pairs in monospace
(label left, value right). Optional metadata footer (document ID, revision, classification).

### Input Fields

Flat surface background (one tier darker than page). 1px border. Label above in mono label style.
All user input renders in monospace. Placeholder text in disabled color.

### Metadata Rows

Uppercase label above value in datasheet pattern: `APPEARANCE | COLLECTION | VERSION`. Used in theme
specimen and settings views.

## Anti-Patterns (Banned)

- No rounded corners (0px border-radius is the rule — squared-off is more technical)
- No soft drop shadows (depth through tonal layering only)
- No gradients on surfaces
- No saturated or neon accent colors in chrome
- No pure black (`#000000`) or pure white (`#FFFFFF`)
- No emoji in the interface
- No decorative icons — prefer text labels or geometric glyphs
- No "vibrant" colors in chrome — only theme content brings color
- No centered hero layouts (prefer asymmetric, left-aligned)
- No generic AI copywriting ("Elevate", "Seamless", "Next-Gen")
- No filler UI text ("Scroll to explore", bouncing chevrons)

## Screens

### Main View — Theme Browser

Split-panel layout. Left: search/filter bar + theme list grouped by collection. Right: selected
theme preview with color swatches, metadata, and description. Bottom status bar with keyboard
shortcuts and sync state. See `design/drafts/` for visual references.

### Setup Wizard / Settings

TBD — to be designed in a future iteration.

## Logo Direction

No official logo yet. A black dot (filled circle). Literal representation of "black atom." Already
embedded in the wordmark as the "o" in "atom." Works at every scale: favicon, app icon, watermark,
badge.

## Light / Dark Mode

Both are first-class. The design must work equally well in both appearances — the chrome adapts, the
structure stays identical. This is especially important for a theme app that literally serves both
appearances.
