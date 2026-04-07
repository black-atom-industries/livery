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

### Typography

- **Mono (primary):** All labels, navigation, status text, section headers, form fields. Uppercase
  with letterspacing for section headers. Berkeley Mono is the visual reference (shipping font TBD —
  needs a free/bundleable alternative).
- **Display/sans (accent):** Theme names and collection names in the main view specimen area only.
  Provides visual weight and distinguishes content from chrome.

### Color System

- **Chrome is near-monochrome.** Dark grays on dark mode, warm off-whites on light mode.
- **Single accent color:** Status green for synced/active indicators.
- **Themes are the color.** Palette swatches and previews bring color. Chrome never competes.
- **Light mode:** Paper-like warmth to backgrounds (not pure white). Matches the website's warm
  gray.
- **Dark mode:** Deep charcoal (not pure black).

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

## Screens

### Screen 1: Main View — Theme Browser

Three-panel layout, left to right.

#### Left Panel — Theme Navigator

- Header: "BLACK ATOM LIVERY" wordmark + version number
- Subtitle: "Color Preservation System" (or similar — TBD)
- Themes grouped by collection with uppercase mono collection headers (DEFAULT, JPN, TERRA)
- Each theme: name + appearance indicator (light/dark icon)
- Selected theme: left border accent (vertical bar)
- Compact, scannable list — this panel is utility

#### Center Panel — Theme Specimen

- Theme name rendered large using display typeface — this is where the accent font lives
- Collection name, appearance badge (bordered pill: `dark` / `light`)
- ABOUT section: theme description in body text
- Metadata row in datasheet pattern — uppercase label over value: APPEARANCE | COLLECTION | VARIANTS
  | PRIMARIES
- PALETTE section: color swatches as a row of squares with abbreviated role labels (bg, fg, acc,
  prp, red, org, ylw, grn, cyn)
- Optional: small syntax-highlighted code preview showing the theme in action
- More whitespace and breathing room than side panels — "vault specimen" feel

#### Right Panel — Adapter Status

- Header: "ADAPTERS" with sync count ("4 synced")
- Each adapter row: icon letter in bordered square (G, N, T, D, Z, L), app name, status label
  (Synced / Coming soon), dimmed reload method (SIGUSR2, Socket, source, config)
- Pure cockpit instrumentation — status readouts

#### Bottom Bar

- Minimal: sync status dot + "All adapters synced", timestamp "Applied 2 min ago"

### Screen 2: Setup Wizard

Step-by-step flow. Each step looks like a page in a technical manual.

- Step indicator at top: `STEP 01 / 04` with title and horizontal rule
- **Step 1 — DETECTION:** "Scanning for supported applications..." List of detected apps with
  checkboxes, detected paths, and found/not-found status.
- **Step 2 — CONFIGURATION:** Per enabled app: config path (editable input), validation status
  (checkmark or warning icon).
- **Step 3 — THEMES PATH:** Locate Black Atom theme directories for apps that need them (tmux,
  lazygit). Path input or file browser.
- **Step 4 — CONFIRMATION:** Summary of config to be written. Bordered box with config preview in
  mono.
- Navigation: `[ BACK ]` and `[ NEXT ]` buttons — squared-off, bordered, matches website link style.

### Screen 3: Settings Page

Single page, vertical scroll. Fully "datasheet" mode.

- One bordered section per adapter
- Each section contains: enabled toggle, config_path input, themes_path input (where applicable)
- Collapsible "ADVANCED" subsection: match_pattern / replace_template overrides
- Path inputs have validation indicator (checkmark/cross) and browse action
- Reload method shown as dimmed label per adapter
- Reset/clear section at bottom

## Logo Direction

A black dot (filled circle). Literal representation of "black atom." Already embedded in the
wordmark as the "o" in "atom." Works at every scale: favicon, app icon, watermark, badge.

## Light / Dark Mode

Both are first-class. The design must work equally well in both appearances — the chrome adapts, the
structure stays identical. This is especially important for a theme app that literally serves both
appearances.
