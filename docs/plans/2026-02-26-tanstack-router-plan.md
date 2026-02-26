# DEV-295: TanStack Router Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan
> task-by-task.

**Goal:** Set up TanStack Router with file-based routing, splitting the app shell from
route-specific layouts.

**Architecture:** Root route owns chrome (header, footer, progress bar area) and renders
`<Outlet />`. Index route renders ThemePicker with its own two-column layout. Settings route is a
placeholder. The Vite plugin auto-generates the route tree from `src/routes/`.

**Tech Stack:** TanStack Router v1, @tanstack/router-plugin (Vite), @tanstack/react-router-devtools

---

### Task 1: Add TanStack Router dependencies to `deno.json`

**Files:**

- Modify: `deno.json`

**Step 1: Add imports**

Add these three entries to the `"imports"` object in `deno.json`, grouped with the other `@tanstack`
packages:

```json
"@tanstack/react-router": "npm:@tanstack/react-router@^1",
"@tanstack/router-plugin": "npm:@tanstack/router-plugin@^1",
"@tanstack/react-router-devtools": "npm:@tanstack/react-router-devtools@^1",
```

Place them after the existing `@tanstack/react-store` line, before `@tanstack/react-hotkeys`.

**Step 2: Verify resolution**

Run: `deno task check` Expected: Passes (no new code uses the imports yet, but Deno resolves them).

---

### Task 2: Add TanStack Router Vite plugin

**Files:**

- Modify: `vite.config.ts`

**Step 1: Add the router plugin import and configuration**

```typescript
import { defineConfig } from "vite";
import deno from "@deno/vite-plugin";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = Deno.env.get("TAURI_DEV_HOST");

export default defineConfig({
    clearScreen: false,
    plugins: [
        deno(),
        tanstackRouter({ target: "react", autoCodeSplitting: true }),
        react(),
        tailwindcss(),
    ],
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    },
});
```

Key: `tanstackRouter()` must come **before** `react()` per TanStack docs. `deno()` stays first since
it handles Deno/JSR resolution.

**Step 2: Verify Vite still builds**

Run: `deno task vite:build` Expected: Build succeeds. The plugin will warn about missing
`src/routes/` directory — that's expected, we create it next.

---

### Task 3: Create the root route (`__root.tsx`)

**Files:**

- Create: `src/routes/__root.tsx`

**Step 1: Create the root route file**

```tsx
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import denoConfig from "../../deno.json" with { type: "json" };
import { AppHeader } from "../components/app-header.tsx";
import { AppFooter } from "../components/app-footer.tsx";

export const Route = createRootRoute({
    component: RootLayout,
});

function RootLayout() {
    return (
        <div className="h-screen flex flex-col bg-neutral-950 text-neutral-100 font-mono">
            <header className="shrink-0 px-6 py-4 border-b border-neutral-800">
                <AppHeader version={denoConfig.version} />
            </header>

            <main className="flex-1 min-h-0">
                <Outlet />
            </main>

            <footer className="shrink-0 px-6 py-2 border-t border-neutral-800 text-xs text-neutral-500">
                <AppFooter />
            </footer>

            <TanStackRouterDevtools position="bottom-right" />
        </div>
    );
}
```

Notes:

- `TanStackRouterDevtools` auto-hides in production builds — no conditional needed.
- `version` comes from `deno.json` directly, same pattern as the old `app.tsx`.
- The outer chrome (bg, font, header/footer borders) lives here. Route content fills `<main>`.

---

### Task 4: Create the index route

**Files:**

- Create: `src/routes/index.tsx`

**Step 1: Create the index route file**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { themeMap } from "@black-atom/core";
import { ThemePicker } from "../containers/theme-picker.tsx";

export const Route = createFileRoute("/")({
    component: IndexRoute,
});

function IndexRoute() {
    return <ThemePicker themeMap={themeMap} />;
}
```

Note: `version` prop is no longer needed on ThemePicker — the root layout handles the header now.

---

### Task 5: Create the settings placeholder route

**Files:**

- Create: `src/routes/settings/route.tsx`

**Step 1: Create the settings route file**

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
    component: SettingsRoute,
});

function SettingsRoute() {
    return (
        <div className="p-6">
            <h2 className="text-lg font-bold">Settings</h2>
            <p className="mt-2 text-sm text-neutral-500">Coming soon.</p>
        </div>
    );
}
```

---

### Task 6: Update ThemePicker — inline layout, remove version prop

**Files:**

- Modify: `src/containers/theme-picker.tsx`

**Step 1: Rewrite ThemePicker**

Remove `MainLayout`, `AppHeader`, and `AppFooter` imports. Remove `version` from props. Inline the
two-column grid that was previously in `MainLayout`:

```tsx
import { useMemo, useState } from "react";
import { useHotkey, useHotkeySequence } from "@tanstack/react-hotkeys";
import { useStore } from "@tanstack/react-store";
import type { ThemeKeyDefinitionMap } from "@black-atom/core";
import { appStore } from "../store/app.ts";
import { getGroupedThemes } from "../lib/themes.ts";
import { ThemeList } from "../components/theme-list.tsx";
import { ThemeDetail } from "../components/theme-detail.tsx";

interface ThemePickerProps {
    themeMap: ThemeKeyDefinitionMap;
}

export function ThemePicker({ themeMap }: ThemePickerProps) {
    const groups = useMemo(() => getGroupedThemes(themeMap), [themeMap]);
    const themes = useMemo(() => groups.flatMap((g) => g.themes), [groups]);

    const selectedTheme = useStore(appStore, (s) => s.selectedTheme);

    const [selectedIndex, setSelectedIndex] = useState(0);
    const selectedEntry = themes[selectedIndex];

    const moveUp = () => setSelectedIndex((i) => Math.max(0, i - 1));
    const moveDown = () => setSelectedIndex((i) => Math.min(themes.length - 1, i + 1));

    // Arrow keys
    useHotkey("ArrowUp", moveUp);
    useHotkey("ArrowDown", moveDown);

    // Vim navigation
    useHotkey("K", moveUp);
    useHotkey("J", moveDown);
    useHotkeySequence(["G", "G"], () => setSelectedIndex(0));
    useHotkey("Shift+G", () => setSelectedIndex(themes.length - 1));

    useHotkey("Enter", () => {
        appStore.setState((s) => ({ ...s, selectedTheme: selectedEntry }));
    });

    return (
        <div className="flex h-full">
            <div className="w-1/2 overflow-y-auto border-r border-neutral-800 px-4 py-3">
                <ThemeList
                    groups={groups}
                    selectedIndex={selectedIndex}
                    onSelect={setSelectedIndex}
                />
            </div>
            <div className="w-1/2 overflow-y-auto px-6 py-3">
                <ThemeDetail theme={selectedEntry} />
                {selectedTheme && (
                    <div className="mt-6 text-sm text-green-400">
                        Selected: {selectedTheme.meta.name}
                    </div>
                )}
            </div>
        </div>
    );
}
```

---

### Task 7: Update `main.tsx` to use RouterProvider

**Files:**

- Modify: `src/main.tsx`

**Step 1: Rewrite main.tsx**

```tsx
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen.ts";
import "./index.css";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

createRoot(document.getElementById("root")!).render(
    <RouterProvider router={router} />,
);
```

Note: The `routeTree.gen.ts` file is auto-generated by the Vite plugin on build/dev. It won't exist
until you run the Vite dev server or build.

---

### Task 8: Delete replaced files

**Files:**

- Delete: `src/containers/app.tsx`
- Delete: `src/components/layouts/main-layout.tsx`

**Step 1: Delete the files**

```bash
rm src/containers/app.tsx src/components/layouts/main-layout.tsx
```

**Step 2: Verify no remaining imports**

Search for any remaining references to the deleted files:

- `containers/app` — should only appear in this plan
- `layouts/main-layout` — should only appear in this plan

---

### Task 9: Verify everything works

**Step 1: Generate the route tree and build**

Run: `deno task vite:build` Expected: Build succeeds. The route tree is auto-generated at
`src/routeTree.gen.ts`.

**Step 2: Type-check**

Run: `deno task check` Expected: All files pass.

**Step 3: Lint**

Run: `deno lint` Expected: No issues (the generated `routeTree.gen.ts` may need to be excluded — if
lint complains, add it to the lint exclude list in `deno.json`).

**Step 4: Run tests**

Run: `deno test --allow-env --allow-read --allow-write` Expected: All 22 tests pass (none test UI
components directly).

**Step 5: Format**

Run: `deno fmt --check` Expected: Passes (generated file may need exclude — handle same as lint).

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add TanStack Router with file-based routing [DEV-295]"
```
