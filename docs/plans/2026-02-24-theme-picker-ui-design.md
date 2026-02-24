# Theme Picker UI Design

**Issue**: DEV-275 **Milestone**: v0.2.0 — Interactive Picker **Date**: 2026-02-24

## Goal

Build a keyboard-first theme picker UI in the Tauri webview. Two-pane layout: theme list on the
left, theme detail on the right.

## Layout

```
┌─────────────────────────────────────────────────────────┐
│  Black Atom Livery v0.0.2    Paint your Cockpit         │  ← AppHeader
├────────────────────────┬────────────────────────────────┤
│  THEMES  (34)          │  THEME DETAIL                  │
│                        │                                │
│  ─ DEFAULT ──────────  │  Spring Day • light            │
│    Dark                │  [TER] TER (Terra)             │
│    Dark Dimmed         │                                │
│    Light               │                                │
│    Light Dimmed        │                                │
│                        │                                │
│  ─ JPN ──────────────  │                                │
│    Koyo Hiru           │                                │
│    Koyo Yoru           │                                │
│                        │                                │
│  ─ TER ──────────────  │                                │
│  > Spring Day  ←active │                                │
│    Spring Night        │                                │
│    ...                 │                                │
├────────────────────────┴────────────────────────────────┤
│  ↑/↓ navigate   Enter select   q quit                  │  ← AppFooter
└─────────────────────────────────────────────────────────┘
```

- 50/50 split, fixed (tunable later via Tailwind classes)
- Left pane scrolls the theme list independently
- Right pane scrolls the detail content independently
- Full height layout — header and footer are fixed, panes fill remaining space

## Interaction

**Keyboard-first:**

- `↑` / `↓` — Move selection through flat theme list (skips collection headers)
- `Enter` — "Select" theme (visual confirmation, no actual applying yet)
- `q` — Quit app (or close window)
- `g` / `G` — Jump to top / bottom (future, not in first pass)

**Mouse as secondary:**

- Click a theme to select it
- Scroll within each pane independently

## Component Architecture

Following the containers/components/layouts pattern from `docs/coding-guidelines.md`.

### Container

| Component     | File                          | Responsibility                                                |
| ------------- | ----------------------------- | ------------------------------------------------------------- |
| `App`         | `containers/app.tsx`          | Root: loads theme data, renders ThemePicker                   |
| `ThemePicker` | `containers/theme-picker.tsx` | Owns selected index, keyboard event handling, selection state |

### Layout

| Component    | File                                 | Responsibility                                  |
| ------------ | ------------------------------------ | ----------------------------------------------- |
| `MainLayout` | `components/layouts/main-layout.tsx` | Full-height grid: header, two-pane body, footer |

### Components

| Component     | File                          | Responsibility                                 |
| ------------- | ----------------------------- | ---------------------------------------------- |
| `AppHeader`   | `components/app-header.tsx`   | Title, version, tagline                        |
| `AppFooter`   | `components/app-footer.tsx`   | Keyboard shortcut hints                        |
| `ThemeList`   | `components/theme-list.tsx`   | Grouped, scrollable list with active highlight |
| `ThemeDetail` | `components/theme-detail.tsx` | Selected theme info (name + appearance badge)  |

### Data Flow

```
App (loads themes)
 └─ ThemePicker (owns selectedIndex, keyboard handlers)
     └─ MainLayout
         ├─ AppHeader
         ├─ ThemeList (themes, selectedIndex, onSelect)
         ├─ ThemeDetail (selectedTheme)
         └─ AppFooter
```

- `App` calls `getThemeEntries()` and `buildPickerOptions()` at module level
- `ThemePicker` receives the flat list, owns `selectedIndex` via `useState`
- `ThemeList` receives the list + selected index + click callback, renders grouped display
- `ThemeDetail` receives the currently selected `ThemeEntry`, renders detail

## Theme List Grouping

Themes are grouped by collection using `COLLECTION_ORDER` from `themes.ts`. Each group gets a header
row (e.g. "DEFAULT", "JPN", "TER"). The flat list for keyboard navigation skips headers — up/down
only moves between selectable theme items.

## Selection Feedback

When Enter is pressed on a theme:

- Brief visual highlight or toast message ("Selected: Spring Day")
- No actual theme application (updaters not built yet — DEV-277)

## Styling

- Dark background matching the Figma draft (`bg-neutral-950` base)
- Monospace font throughout
- Tailwind utility classes only
- Selected theme row gets distinct highlight color
- Collection headers are dimmed/subtle

## First Pass Scope

1. Layout shell (MainLayout with header, panes, footer)
2. Theme list with collection grouping
3. Keyboard navigation (up/down/enter)
4. Theme detail: name + appearance badge
5. Selection feedback (visual confirmation)
6. Footer with shortcut hints

## Out of Scope

- Actual theme applying (DEV-277 — tool updaters)
- Color swatches in detail pane (future iteration)
- Full metadata table (future iteration)
- Description text and collection info (future iteration)
- Resizable panes
- Search / filter
