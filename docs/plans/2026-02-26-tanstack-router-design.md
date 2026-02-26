# DEV-295: TanStack Router with File-Based Routing

## Context

Livery needs routing for the picker view and upcoming settings page. TanStack Router with file-based
routing gives us type-safe routes, code splitting, and a conventional file structure.

## Design

### Route structure

```
src/routes/
├── __root.tsx          # RootLayout: header, footer, progress bar area, <Outlet />
├── index.tsx           # "/" — ThemePicker
├── settings/
│   └── route.tsx       # "/settings" — placeholder
```

### Root layout (`__root.tsx`)

Owns the full-screen shell: `h-screen flex flex-col`, `AppHeader`, `AppFooter`, and a single
`<main>` slot rendering `<Outlet />`. No two-column grid — that's route-specific.

`AppHeader` receives `version` from `deno.json` (imported with `with { type: "json" }`).

TanStack Router Devtools included in dev mode.

### Index route (`routes/index.tsx`)

Renders `ThemePicker`. The two-column layout is owned by ThemePicker (inlined from the current
`MainLayout`). `themeMap` imported directly from `@black-atom/core`.

### Settings route (`routes/settings/route.tsx`)

Placeholder — renders a simple "coming soon" message.

### Entry point (`main.tsx`)

Standard TanStack Router setup: import generated `routeTree` from `routeTree.gen.ts`, create router,
register for type safety, render `<RouterProvider />`.

### Vite config

Add `tanstackRouter()` plugin before `react()` per TanStack docs.

### Dependencies (added to `deno.json`)

- `@tanstack/react-router`
- `@tanstack/router-plugin`
- `@tanstack/react-router-devtools`

### Deletions

- `src/containers/app.tsx` — replaced by root route
- `src/components/layouts/main-layout.tsx` — two-column grid inlined into ThemePicker

## Decisions

- **Layout split**: Root route owns chrome (header/footer). Route components own their content
  layout.
- **No shared two-column layout component**: Only one consumer (ThemePicker), so inline it. Extract
  later if needed.
- **File-based routing over manual**: Conventional, scales well, auto-generates route tree.
