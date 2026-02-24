# Theme Picker UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan
> task-by-task.

**Goal:** Build a keyboard-first, two-pane theme picker UI in the Tauri webview (DEV-275).

**Architecture:** Containers own state and logic, components are dumb UI. A `MainLayout` provides
the full-height two-pane grid. `ThemePicker` container manages selection state and keyboard events.
Theme data comes from the existing `getThemeEntries()` in `src/lib/themes.ts`.

**Tech Stack:** React 18, Tailwind CSS v4, Deno, Tauri v2

**Design doc:** `docs/plans/2026-02-24-theme-picker-ui-design.md`

**Figma reference:** `assets/design-draft/ui.png`

---

## Task 1: Export grouping helpers from themes.ts

`COLLECTION_ORDER` and `COLLECTION_LABELS` are currently private in `src/lib/themes.ts`. The UI
needs them for rendering grouped theme lists.

**Files:**

- Modify: `src/lib/themes.ts`

**Step 1: Export the constants**

In `src/lib/themes.ts`, change:

```typescript
const COLLECTION_ORDER: CollectionKey[] = [...]
const COLLECTION_LABELS: Record<CollectionKey, string> = {...]
```

to:

```typescript
export const COLLECTION_ORDER: CollectionKey[] = [...]
export const COLLECTION_LABELS: Record<CollectionKey, string> = {...]
```

**Step 2: Add a `getGroupedThemes()` function**

Add to `src/lib/themes.ts`:

```typescript
export interface ThemeGroup {
    collectionKey: CollectionKey;
    label: string;
    themes: ThemeEntry[];
}

/** Group themes by collection in display order. Sorts themes within each group by short name. */
export function getGroupedThemes(): ThemeGroup[] {
    const entries = getThemeEntries();

    const groups = new Map<CollectionKey, ThemeEntry[]>();
    for (const entry of entries) {
        const key = entry.meta.collection.key;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(entry);
    }

    for (const group of groups.values()) {
        group.sort((a, b) => extractShortName(a.meta).localeCompare(extractShortName(b.meta)));
    }

    return COLLECTION_ORDER
        .filter((key) => groups.has(key))
        .map((key) => ({
            collectionKey: key,
            label: COLLECTION_LABELS[key] ?? key,
            themes: groups.get(key)!,
        }));
}
```

**Step 3: Run tests**

Run: `deno test --allow-env --allow-read --allow-write`

Expected: All 23 tests pass (no existing test breaks).

**Step 4: Run lint and format**

Run: `deno lint && deno fmt`

**Step 5: Commit**

```
git add src/lib/themes.ts
git commit -m "refactor: export grouping helpers and add getGroupedThemes()"
```

---

## Task 2: Create MainLayout component

The full-height layout shell: header slot, two-pane body (50/50), footer slot.

**Files:**

- Create: `src/components/layouts/main-layout.tsx`

**Step 1: Create the layout**

```tsx
import type { ReactNode } from "react";

interface MainLayoutProps {
    header: ReactNode;
    left: ReactNode;
    right: ReactNode;
    footer: ReactNode;
}

export function MainLayout({ header, left, right, footer }: MainLayoutProps) {
    return (
        <div className="h-screen flex flex-col bg-neutral-950 text-neutral-100 font-mono">
            <header className="shrink-0 px-6 py-4 border-b border-neutral-800">
                {header}
            </header>

            <main className="flex-1 flex min-h-0">
                <div className="w-1/2 overflow-y-auto border-r border-neutral-800 px-4 py-3">
                    {left}
                </div>
                <div className="w-1/2 overflow-y-auto px-6 py-3">
                    {right}
                </div>
            </main>

            <footer className="shrink-0 px-6 py-2 border-t border-neutral-800 text-xs text-neutral-500">
                {footer}
            </footer>
        </div>
    );
}
```

**Step 2: Run lint and format**

Run: `deno lint && deno fmt`

**Step 3: Commit**

```
git add src/components/layouts/main-layout.tsx
git commit -m "feat: add MainLayout two-pane layout component"
```

---

## Task 3: Create AppHeader and AppFooter components

**Files:**

- Create: `src/components/app-header.tsx`
- Create: `src/components/app-footer.tsx`

**Step 1: Create AppHeader**

```tsx
interface AppHeaderProps {
    version: string;
}

export function AppHeader({ version }: AppHeaderProps) {
    return (
        <div>
            <h1 className="text-xl font-bold">
                Black Atom Livery{" "}
                <span className="text-sm font-normal text-neutral-500">v{version}</span>
            </h1>
            <p className="text-sm text-neutral-500">Paint your Cockpit</p>
        </div>
    );
}
```

**Step 2: Create AppFooter**

```tsx
interface Shortcut {
    key: string;
    label: string;
}

const SHORTCUTS: Shortcut[] = [
    { key: "↑/↓", label: "navigate" },
    { key: "Enter", label: "select" },
    { key: "q", label: "quit" },
];

export function AppFooter() {
    return (
        <div className="flex gap-6">
            {SHORTCUTS.map((s) => (
                <span key={s.key}>
                    <kbd className="text-neutral-300">{s.key}</kbd>{" "}
                    <span className="text-neutral-500">{s.label}</span>
                </span>
            ))}
        </div>
    );
}
```

**Step 3: Run lint and format**

Run: `deno lint && deno fmt`

**Step 4: Commit**

```
git add src/components/app-header.tsx src/components/app-footer.tsx
git commit -m "feat: add AppHeader and AppFooter components"
```

---

## Task 4: Create ThemeList component

Scrollable grouped list with active item highlight and click support.

**Files:**

- Create: `src/components/theme-list.tsx`

**Step 1: Create ThemeList**

The component receives grouped themes, a flat index for the selected item, and a click callback. It
needs to map from the per-group rendering back to the flat index.

```tsx
import type { ThemeGroup } from "../lib/themes.ts";
import { extractShortName } from "../lib/themes.ts";

interface ThemeListProps {
    groups: ThemeGroup[];
    selectedIndex: number;
    onSelect: (index: number) => void;
}

export function ThemeList({ groups, selectedIndex, onSelect }: ThemeListProps) {
    let flatIndex = 0;

    return (
        <div>
            {groups.map((group) => {
                const items = group.themes.map((entry) => {
                    const index = flatIndex++;
                    const isSelected = index === selectedIndex;
                    const name = extractShortName(entry.meta);
                    const icon = entry.meta.appearance === "dark" ? "☾" : "☀";

                    return (
                        <button
                            key={entry.key}
                            type="button"
                            onClick={() => onSelect(index)}
                            className={`block w-full text-left px-3 py-1 text-sm cursor-pointer ${
                                isSelected
                                    ? "bg-neutral-800 text-neutral-100"
                                    : "text-neutral-400 hover:text-neutral-200"
                            }`}
                        >
                            {isSelected ? "> " : "  "}
                            {name}
                            <span className="ml-2 text-neutral-600">{icon}</span>
                        </button>
                    );
                });

                return (
                    <div key={group.collectionKey} className="mb-2">
                        <div className="px-3 py-1 text-xs text-neutral-600 uppercase tracking-wider">
                            {group.label} ({group.themes.length})
                        </div>
                        {items}
                    </div>
                );
            })}
        </div>
    );
}
```

**Step 2: Run lint and format**

Run: `deno lint && deno fmt`

**Step 3: Commit**

```
git add src/components/theme-list.tsx
git commit -m "feat: add ThemeList grouped component with selection highlight"
```

---

## Task 5: Create ThemeDetail component

Minimal right pane showing the selected theme's name and appearance badge.

**Files:**

- Create: `src/components/theme-detail.tsx`

**Step 1: Create ThemeDetail**

```tsx
import type { ThemeEntry } from "../lib/themes.ts";
import { extractShortName } from "../lib/themes.ts";

interface ThemeDetailProps {
    theme: ThemeEntry | undefined;
}

export function ThemeDetail({ theme }: ThemeDetailProps) {
    if (!theme) {
        return <div className="text-neutral-600 text-sm">No theme selected</div>;
    }

    const name = extractShortName(theme.meta);
    const appearance = theme.meta.appearance;
    const collection = theme.meta.collection.label;

    return (
        <div>
            <h2 className="text-2xl font-bold mb-1">
                {name}{" "}
                <span
                    className={`text-sm font-normal px-2 py-0.5 rounded ${
                        appearance === "dark"
                            ? "bg-neutral-800 text-neutral-400"
                            : "bg-neutral-200 text-neutral-800"
                    }`}
                >
                    {appearance}
                </span>
            </h2>
            <p className="text-sm text-neutral-500">{collection}</p>
        </div>
    );
}
```

**Step 2: Run lint and format**

Run: `deno lint && deno fmt`

**Step 3: Commit**

```
git add src/components/theme-detail.tsx
git commit -m "feat: add ThemeDetail component with name and appearance badge"
```

---

## Task 6: Create ThemePicker container

The smart container that owns selection state, keyboard handling, and wires all components together.

**Files:**

- Create: `src/containers/theme-picker.tsx`

**Step 1: Create ThemePicker**

```tsx
import { useCallback, useEffect, useState } from "react";
import type { ThemeEntry, ThemeGroup } from "../lib/themes.ts";
import { MainLayout } from "../components/layouts/main-layout.tsx";
import { AppHeader } from "../components/app-header.tsx";
import { AppFooter } from "../components/app-footer.tsx";
import { ThemeList } from "../components/theme-list.tsx";
import { ThemeDetail } from "../components/theme-detail.tsx";

interface ThemePickerProps {
    groups: ThemeGroup[];
    themes: ThemeEntry[];
    version: string;
}

export function ThemePicker({ groups, themes, version }: ThemePickerProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedTheme, setSelectedTheme] = useState<ThemeEntry | undefined>(
        undefined,
    );

    const selectedEntry = themes[selectedIndex];

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowUp":
                    e.preventDefault();
                    setSelectedIndex((i) => Math.max(0, i - 1));
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    setSelectedIndex((i) => Math.min(themes.length - 1, i + 1));
                    break;
                case "Enter":
                    e.preventDefault();
                    setSelectedTheme(selectedEntry);
                    break;
            }
        },
        [themes.length, selectedEntry],
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    return (
        <MainLayout
            header={<AppHeader version={version} />}
            left={
                <ThemeList
                    groups={groups}
                    selectedIndex={selectedIndex}
                    onSelect={setSelectedIndex}
                />
            }
            right={
                <div>
                    <ThemeDetail theme={selectedEntry} />
                    {selectedTheme && (
                        <div className="mt-6 text-sm text-green-400">
                            Selected: {extractShortName(selectedTheme.meta)}
                        </div>
                    )}
                </div>
            }
            footer={<AppFooter />}
        />
    );
}
```

Note: needs `import { extractShortName } from "../lib/themes.ts";` at top.

**Step 2: Run lint and format**

Run: `deno lint && deno fmt`

**Step 3: Commit**

```
git add src/containers/theme-picker.tsx
git commit -m "feat: add ThemePicker container with keyboard navigation"
```

---

## Task 7: Wire everything into App container

Replace the current proof-of-concept `App` with the real ThemePicker.

**Files:**

- Modify: `src/containers/app.tsx`

**Step 1: Update App**

Replace the entire contents of `src/containers/app.tsx`:

```tsx
import { getGroupedThemes } from "../lib/themes.ts";
import { ThemePicker } from "./theme-picker.tsx";

const groups = getGroupedThemes();
const themes = groups.flatMap((g) => g.themes);

export function App() {
    return <ThemePicker groups={groups} themes={themes} version="0.0.2" />;
}
```

**Step 2: Run tests**

Run: `deno test --allow-env --allow-read --allow-write`

Expected: All 23 tests pass.

**Step 3: Run lint and format**

Run: `deno lint && deno fmt`

**Step 4: Visual test**

Run: `deno task dev`

Expected: Tauri window opens showing:

- Header with "Black Atom Livery v0.0.2" and tagline
- Left pane with grouped theme list, first theme highlighted
- Right pane showing selected theme name and appearance badge
- Footer with keyboard shortcut hints
- Arrow keys move selection, Enter shows "Selected: ..." confirmation

**Step 5: Commit**

```
git add src/containers/app.tsx
git commit -m "feat: wire ThemePicker into App root container (DEV-275)"
```

---

## Task 8: Auto-scroll selected item into view

When keyboard navigating, the selected item should scroll into view if it's off-screen.

**Files:**

- Modify: `src/components/theme-list.tsx`

**Step 1: Add scroll-into-view behavior**

Add a ref callback on the selected button:

```tsx
// In the button element for the selected item, add:
ref={isSelected ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
```

**Step 2: Visual test**

Run: `deno task dev`

Arrow down through the full list — the left pane should scroll to keep the selection visible.

**Step 3: Commit**

```
git add src/components/theme-list.tsx
git commit -m "feat: auto-scroll selected theme into view on keyboard nav"
```

---

## Summary

| Task | Component               | Type                 |
| ---- | ----------------------- | -------------------- |
| 1    | Export grouping helpers | Refactor (themes.ts) |
| 2    | MainLayout              | Layout component     |
| 3    | AppHeader + AppFooter   | Dumb components      |
| 4    | ThemeList               | Dumb component       |
| 5    | ThemeDetail             | Dumb component       |
| 6    | ThemePicker             | Smart container      |
| 7    | Wire into App           | Integration          |
| 8    | Auto-scroll             | Enhancement          |
