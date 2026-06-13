# UI Improvement Plan — Livery Theme Browser

## Visual Design Specification

### Aesthetic

Industrial datasheet / technical documentation. Bordered panels, squared corners, warm monochrome
chrome with muted green accents. Display type (Space Grotesk) for theme names and titles. Everything
else rendered in monospace (Recursive MONO axis) — labels, metadata, keyboard shortcuts, section
headers. The interface speaks in uppercase abbreviations and key-value pairs, not conversational UI.

### Layout Structure

```
┌──────────────────────────────────────────────────────────┐
│ [ HEADER ]                          BLACK ATOM LIVERY v0 │ ← AppShell header
│                                    Paint your Cockpit    │
├──────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐  ┌──────────────────────────┐  │
│ │ THEMES               │  │ DETAIL                   │  │ ← Section headers w/ rule
│ │ ──────────────────── │  │ ─────────────────────────│  │
│ │                      │  │                          │  │
│ │ Black Atom           │  │ ● Black Atom Default Dark │  │ ← SplitPanel
│ │   > Default Dark  ◉  │  │   [DARK]                 │  │   left: theme list
│ │     Default Light ○  │  │                          │  │   right: theme detail card
│ │     Terra Fall      │  │   COLLECTION              │  │
│ │     Terra Fall Dark │  │   Black Atom Industries   │  │
│ │                      │  │                          │  │
│ │ Terra Fall           │  │   APPEARANCE              │  │
│ │   ...                │  │   dark                    │  │
│ │                      │  │                          │  │
│ └──────────────────────┘  └──────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│ [████████████████░░░░░░░░░░] Applying theme... 3 / 8     │ ← progress bar
├──────────────────────────────────────────────────────────┤
│ ↑/↓ navigate    Enter select    gg/G top/bottom    q quit│ ← keyboard shortcuts
└──────────────────────────────────────────────────────────┘
```

### Color Palette (all from `--lvr-color-*` tokens)

| Role             | Dark Mode                                   | Light Mode           |
| ---------------- | ------------------------------------------- | -------------------- |
| Page background  | warm dark charcoal `--lvr-color-bg-default` | warm cream off-white |
| Panel background | slightly lighter `--lvr-color-bg-subtle`    | slightly darker      |
| Borders          | `--lvr-color-bg-hint` (1px solid)           | same                 |
| Text             | `--lvr-color-fg-default` (warm off-white)   | warm near-black      |
| Subtle text      | `--lvr-color-fg-subtle` (80% opacity)       | same                 |
| Hint text        | `--lvr-color-fg-hint` (60% opacity)         | same                 |
| Accent           | Muted green `--lvr-color-fg-accent`         | same                 |
| Selection bg     | `--lvr-color-bg-accent` (muted green)       | same                 |
| Positive/synced  | `--lvr-color-fg-positive`                   | same                 |

### Component Patterns

**Section Headers**: Uppercase mono label (Recursive, MONO=1, 10px, 500 weight, 0.06em tracking)
with a 1px horizontal rule beneath extending full width. Optional right-aligned metadata.

**Theme List Items**: Full-width buttons. Unselected: subtle text. Selected: accent background +
contrast text + ChevronRight indicator. Appearance pip: small filled circle (dark=subtle fill,
light=contrast fill) — or Lucide Sun/Moon at 12px.

**Detail Card**: 1px solid border, squared. Inner padding. Header: theme name in Space Grotesk Bold

- Badge component (appearance). Metadata rows: uppercase mono label over value.

**Keyboard Shortcuts**: Monospace, hint color for labels, subtle color for key bindings. Rendered in
a single row with generous gaps.

**Progress Bar**: Track: accent background. Indicator: status-colored (warn=running, positive=done,
negative=error). Labels: mono, subtle color.

**Buttons (Actuator style)**: `[ LABEL ]` bracket notation. Primary: filled contrast bg + inverse
text. Secondary: 1px border, transparent fill. All: mono uppercase, no rounded corners.

## Architecture Decision

**Routes must not own styles.** Layout components carry all structural styling. Routes compose
layouts + page content and remain style-free.

### Compound Component Pattern

Following the existing `Typo` namespace convention (`Typo.H1`, `Typo.P`, etc.), layout components
are exposed as a compound `App` namespace:

```ts
// src/components/layouts/app.ts
export const App = {
    Shell, // full app chrome: header bar, main area, progress bar, footer bar
    SplitPanel, // two-panel layout for the main browser view
} as const;
```

### Component Hierarchy

```tsx
// __root.tsx — outermost shell, zero styles
<App.Shell>
  <Outlet />
</App.Shell>

// _app/route.tsx — app chrome, zero styles
<App.Shell
  header={<AppHeader version={version} />}
  progress={<ProgressBar results={updaterResults} />}
  footer={<AppFooter />}
>
  <Outlet />
</App.Shell>

// _app/index.tsx — theme browser page, zero styles
<App.SplitPanel
  left={
    <>
      <SectionHeader label="THEMES" />
      <ThemeList groups={groups} selectedIndex={pickedIndex} onSelect={setPickedIndex} />
    </>
  }
  right={
    <>
      <SectionHeader label="DETAIL" />
      <ThemeDetail theme={pickedEntry} />
    </>
  }
/>
```

## Approach

1. Remove ALL Tailwind from the project (imports, plugins, dependencies, utility classes)
2. Add `lucide-react` for icons (Sun, Moon, ChevronRight)
3. Create layout components (`App.Shell`, `App.SplitPanel`) that carry all structural styling via
   CSS modules + `--lvr-*` variables
4. Create new primitives (`SectionHeader`, `StatusIndicator`) per DESIGN.md component patterns
5. Rewrite route files to be pure composition — zero CSS, zero className, zero inline styles
6. Enhance existing components (`theme-list`, `theme-detail`, `app-footer`, `app-header`) to use
   Lucide icons and DESIGN.md patterns

## Files to Modify

### Infrastructure — Remove Tailwind

| File             | Change                                                      |
| ---------------- | ----------------------------------------------------------- |
| `vite.config.ts` | Remove `tailwindcss` import and `tailwindcss()` plugin call |
| `src/index.css`  | Remove `@import "tailwindcss"` line                         |
| `deno.json`      | Remove `tailwindcss` and `@tailwindcss/vite` from imports   |
| `src/AGENTS.md`  | Change "Tailwind CSS" → "CSS Modules" in Styling section    |

### New Layout Components (`src/components/layouts/`)

All exposed as compound `App` namespace in `src/components/layouts/app.ts`.

| File                                            | Purpose                                                                                                                                                                                                                                                                    |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/layouts/app.ts`                 | **New** — Barrel that re-exports as `App.Shell`, `App.SplitPanel` compound namespace                                                                                                                                                                                       |
| `src/components/layouts/app-shell.tsx`          | **New** — Full app chrome: header slot, main content children, progress slot, footer slot. Outer flex column, `--lvr-color-bg-default` background, `--lvr-color-fg-default` color, `--lvr-font-family-body`. Header/footer bars have 1px borders in `--lvr-color-bg-hint`. |
| `src/components/layouts/app-shell.module.css`   | **New** — Shell styles (flex layout, borders, padding)                                                                                                                                                                                                                     |
| `src/components/layouts/split-panel.tsx`        | **New** — Two-panel layout: `left` and `right` slot props. 50/50 split, 1px right border on left panel, overflow-y scroll.                                                                                                                                                 |
| `src/components/layouts/split-panel.module.css` | **New** — SplitPanel styles (flex row, widths, borders, overflow)                                                                                                                                                                                                          |

### New Primitives (`src/components/primitives/`)

| File                                                                 | Purpose                                                                                              |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/components/primitives/section-header/section-header.tsx`        | **New** — Uppercase mono label + horizontal rule underneath. Props: `label: string`, `meta?: string` |
| `src/components/primitives/section-header/section-header.module.css` | **New** — font, tracking, rule styling                                                               |

### Route Files — Rewrite as pure composition

| File                                 | Change                                                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `src/routes/__root.tsx`              | Replace Tailwind + inline style with `<App.Shell><Outlet /></App.Shell>`                                             |
| `src/routes/_app/route.tsx`          | Replace all Tailwind with `<App.Shell header={...} progress={...} footer={...}><Outlet /></App.Shell>`               |
| `src/routes/_app/index.tsx`          | Replace all Tailwind with `<App.SplitPanel left={...} right={...} />` + `Typo.Small` for indicator + section headers |
| `src/routes/_app/settings/route.tsx` | Replace Tailwind with CSS module + `Typo.H2`                                                                         |

### Existing Components — Enhance

| File                                     | Change                                                                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/components/app-footer.tsx`          | Replace Tailwind classes + inline styles with CSS module. Use Lucide `Keyboard` icon (optional).                     |
| `src/components/app-footer.module.css`   | **New** — mono font, hint/subtle colors, flex layout                                                                 |
| `src/components/theme-list.tsx`          | Replace ☾/☀ emoji with Lucide `Sun`/`Moon` icons. Replace `>` text indicator with Lucide `ChevronRight`.             |
| `src/components/theme-list.module.css`   | Add icon spacing, refine selected/hover with token variables                                                         |
| `src/components/theme-detail.tsx`        | Replace inline `<span>` badge with `Badge` primitive. Use `Typo.H2` + `Typo.Lead`. Wrap in datasheet card container. |
| `src/components/theme-detail.module.css` | Add 1px bordered card, metadata rows (key-value), squared corners                                                    |
| `src/components/app-header.module.css`   | Refine per DESIGN.md — display font for title, mono for version                                                      |

### New Dependency

| Package        | Import                | Purpose                       |
| -------------- | --------------------- | ----------------------------- |
| `lucide-react` | `npm:lucide-react@^0` | Sun, Moon, ChevronRight icons |

## Reuse

- **`src/components/typo/`** — `Typo` namespace (H1–H4, P, Lead, Small) with `color` prop. Primary
  text rendering system. Use in ALL route/page content.
- **`src/components/primitives/badge/`** — `Badge` component (mono, 0 radius, 1px dotted border,
  underlined). Use for appearance badge in theme-detail.
- **`src/styles/variables/colors.css`** — `--lvr-color-bg-*` and `--lvr-color-fg-*`. Only source of
  color. No hex values anywhere.
- **`src/styles/variables/borders.css`** — `--lvr-border-size-1` (1px), `--lvr-radius-1` (2px max).
- **`src/styles/variables/typography.css`** — Font families, sizes, weights, letter-spacing.
- **`src/styles/variables/sizes.css`** — `--lvr-size-1` through `--lvr-size-15` spacing scale.
- **`src/styles/variables/durations.css`** / **`easings.css`** — Animation tokens.
- **`src/components/progress-bar.tsx`** — Already uses CSS modules; no changes needed.
- **`src/components/dev-layout/`** — Reference for proper CSS variable usage. Do NOT modify.

## Steps

### Step 1: Add Lucide dependency

- [ ] Add `"lucide-react": "npm:lucide-react@^0"` to `deno.json` imports
- [ ] Run `deno cache`

### Step 2: Remove Tailwind

- [ ] Remove `@import "tailwindcss"` from `src/index.css`
- [ ] Remove `import tailwindcss from "@tailwindcss/vite"` and `tailwindcss()` from `vite.config.ts`
- [ ] Remove `"tailwindcss"` and `"@tailwindcss/vite"` from `deno.json` imports
- [ ] Update `src/AGENTS.md` — "Tailwind CSS" → "CSS Modules"

### Step 3: Create `App.Shell` layout component

- [ ] Create `src/components/layouts/app-shell.tsx` — Props: `header?: ReactNode`,
      `progress?: ReactNode`, `footer?: ReactNode`, `children: ReactNode`
- [ ] Create `src/components/layouts/app-shell.module.css`:
  - `.root` — full height, flex column, `--lvr-color-bg-default` background,
    `--lvr-color-fg-default` text, `--lvr-font-family-body`
  - `.header` — shrink-0, padding, 1px bottom border `var(--lvr-color-bg-hint)`
  - `.main` — flex-1, min-height 0
  - `.progress` — shrink-0, padding, 1px top border `var(--lvr-color-bg-hint)`
  - `.footer` — shrink-0, padding, 1px top border `var(--lvr-color-bg-hint)`
- [ ] Rewrite `__root.tsx` — `<App.Shell><Outlet /></App.Shell>`, zero styles, zero className
- [ ] Rewrite `_app/route.tsx` —
      `<App.Shell header={...} progress={...} footer={...}><Outlet /></App.Shell>`, zero styles

### Step 4: Create `App.SplitPanel` layout component

- [ ] Create `src/components/layouts/split-panel.tsx` — Props: `left: ReactNode`, `right: ReactNode`
- [ ] Create `src/components/layouts/split-panel.module.css`:
  - `.root` — flex row, full height
  - `.left` — 50% width, overflow-y-auto, 1px right border `var(--lvr-color-bg-hint)`, padding
  - `.right` — 50% width, overflow-y-auto, padding
- [ ] Rewrite `_app/index.tsx` — use `<App.SplitPanel left={...} right={...}>`, remove all Tailwind
      classes, zero direct styles

### Step 5: Create `App` barrel export

- [ ] Create `src/components/layouts/app.ts`:
  ```ts
  import { AppShell } from "./app-shell.tsx";
  import { SplitPanel } from "./split-panel.tsx";
  export const App = { Shell: AppShell, SplitPanel } as const;
  ```

### Step 6: Create `SectionHeader` primitive

- [ ] Create `src/components/primitives/section-header/` directory
- [ ] Create `section-header.module.css`:
  - `.root` — flex row, justify between, align baseline
  - `.label` — mono font, 10px, 500 weight, uppercase, 0.06em tracking, `--lvr-color-fg-subtle`
  - `.rule` — 1px solid `var(--lvr-color-bg-hint)`, full width, margin-top
  - `.meta` — mono, 10px, `--lvr-color-fg-hint`
- [ ] Create `section-header.tsx` — Props: `label: string`, `meta?: string`
- [ ] Use in `_app/index.tsx` above theme list ("THEMES") and detail panel ("DETAIL")

### Step 7: Create `app-footer.module.css` and rewrite `app-footer.tsx`

- [ ] Create `src/components/app-footer.module.css`:
  - `.root` — flex row, gap, mono font, `--lvr-font-size-00`
  - `.shortcut` — flex row, align center, gap
  - `.keys` — `--lvr-color-fg-subtle` color
  - `.label` — `--lvr-color-fg-hint` color, uppercase
- [ ] Rewrite `app-footer.tsx` — remove all Tailwind + inline styles; use CSS module

### Step 8: Enhance `theme-list.tsx` with Lucide icons

- [ ] Import `Sun`, `Moon`, `ChevronRight` from `lucide-react`
- [ ] Replace emoji ☀/☾ with `<Sun size={12} />` / `<Moon size={12} />`
- [ ] Replace `>` text cursor with `<ChevronRight size={14} />` shown only on selected item
- [ ] Update `theme-list.module.css` — add `.icon` and `.cursor` classes using token colors

### Step 9: Enhance `theme-detail.tsx` — datasheet card pattern

- [ ] Import `Badge` primitive
- [ ] Replace inline appearance `<span>` with `<Badge>{appearance}</Badge>`
- [ ] Use `Typo.H2` for theme name, `Typo.Lead color="subtle"` for collection
- [ ] Wrap content in a `.card` container with 1px solid border, squared, padding
- [ ] Add metadata rows: "COLLECTION" / `collection`, "APPEARANCE" / `appearance` in mono key-value
      layout
- [ ] Update `theme-detail.module.css`:
  - `.card` — 1px solid `var(--lvr-color-bg-hint)`, 0 border-radius, padding
  - `.empty` — hint color, centered
  - `.metaRow` — flex, gap, mono font
  - `.metaLabel` — uppercase, 10px, hint color
  - `.metaValue` — subtle color

### Step 10: Refine `app-header.module.css`

- [ ] Title: Space Grotesk Bold, `--lvr-font-size-3`, `--lvr-font-weight-7`
- [ ] Version: mono font, `--lvr-font-size-0`, `--lvr-color-fg-subtle`
- [ ] Subtitle: `--lvr-font-size-0`, `--lvr-color-fg-hint`, uppercase mono per DESIGN.md
- [ ] Bottom border is handled by `App.Shell` — no border needed here

### Step 11: Fix settings route

- [ ] Create `src/routes/_app/settings/route.module.css`
- [ ] Rewrite settings route — use CSS module, `Typo.H2`, `Typo.Small color="hint"`
- [ ] Remove all Tailwind classes

### Step 12: Cleanup and verify

- [ ] `grep -r "neutral-" src/routes/ src/components/` — zero results
- [ ] `grep -r "tailwindcss" src/` — zero results (except maybe in node_modules or comments)
- [ ] `grep -r 'className="[^"]*\b(bg-|text-|flex |w-|h-|shrink-|overflow-|border-|px-|py-|mt-|gap-|min-h-)' src/routes/ src/components/`
      — zero Tailwind utility classes
- [ ] `deno task check` passes
- [ ] `deno fmt` passes
- [ ] `deno lint` passes
- [ ] `deno task build` succeeds

## Verification

1. **Build** — `deno task build` passes clean (no Tailwind dependency, no missing modules)
2. **No Tailwind traces** — zero utility classes or imports in source
3. **Dark mode renders correctly** — warm dark grays, readable text, bordered panels, green accent
   for selection
4. **Light mode renders correctly** — warm cream backgrounds, dark text, visible borders
5. **All colors from CSS variables** — inspect any element, every color property references a
   `var(--lvr-color-*)`
6. **Keyboard navigation intact** — ↑/↓/j/k/gg/G/Enter all work
7. **Theme application works** — selecting and applying themes still functions
8. **Dev routes unaffected** — `/dev`, `/dev/primitives`, `/dev/typography` render correctly
9. **Layout components can be reused** — `App.Shell` and `App.SplitPanel` are generic and accept
   arbitrary slot content
