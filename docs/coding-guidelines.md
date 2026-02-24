# Coding Guidelines

## Project Structure

```
src/
  main.tsx              # Entry point — renders into DOM, imports CSS
  index.css             # Tailwind entry (@import "tailwindcss")
  config.ts             # DEFAULT_CONFIG constant
  types/                # Shared type definitions
  lib/                  # Pure logic — no React, no side effects
  containers/           # Smart components (data fetching, state, orchestration)
  components/           # Dumb components (props in, JSX out)
    layouts/            # Layout components (page shells, grid structures)
  updaters/             # Theme updaters (Rust commands in future)
src-tauri/              # Rust backend (Tauri commands, system integration)
docs/                   # Project documentation
```

## React Conventions

### Containers vs Components

- **Containers** (`src/containers/`): Own state, fetch data, orchestrate logic. Named after what
  they manage (e.g. `app.tsx`, `theme-picker.tsx`). Minimal to no styling — delegate to components.
- **Components** (`src/components/`): Receive props, render UI. No direct data fetching or global
  state access. Named after what they display (e.g. `theme-list.tsx`, `status-badge.tsx`).
- **Layouts** (`src/components/layouts/`): Page-level shells that define structure (sidebar, header,
  content area). They are dumb components — they receive children and arrange them.

### Styling Ownership

- Almost all styling happens in **components**, not containers.
- Containers should only have styling in rare cases (e.g. a top-level wrapper with minimal layout).
- A component's styles should never reference another component's classes. Components are
  independent and don't know about each other.

### Rules

- One component/container per file. File name matches the export.
- Prefer function declarations for components (`export function Foo()` not `const Foo = () =>`).
- Props as inline type or named interface — no `React.FC`.
- No `any`. Use `unknown` as a last resort.
- Prefer object arguments for functions with 2+ parameters.

## Styling

- Tailwind utility classes only — no custom CSS unless absolutely necessary.
- Component styles stay in the component.
- Use semantic class grouping: layout → spacing → typography → color.

## TypeScript

- Strict mode. No implicit `any`.
- Prefer explicit types on function signatures and public APIs.
- Use generics where they add clarity, not for show.
- `.ts` for pure logic, `.tsx` for anything that returns JSX.

## File Naming

- `kebab-case` for all files and directories.
- `.ts` / `.tsx` extensions — always explicit in imports (Deno requirement).

## Formatting & Linting

- `deno fmt` — 4-space indent, double quotes, semicolons, 100 char line width.
- `deno lint` — all default rules apply.
- Format and lint before committing. Both must pass.

## Testing

- Test files live next to the code they test: `foo.ts` → `foo_test.ts`.
- Use `@std/assert` for assertions.
- Run with `deno test --allow-env --allow-read --allow-write`.

## Git

- Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.
- Every commit must be green (tests pass, lint clean).
- Amend small fixes into the previous commit rather than stacking fix commits.

## Deno + Vite Dual Resolution

The `@black-atom/core` package resolves differently depending on context:

- **Deno** (tests, lint, check): via JSR import map in `deno.json`
- **Vite** (dev server, build): via `@jsr/black-atom__core` npm compat in `node_modules`, aliased in
  `vite.config.ts`

Both must stay in sync. When updating `@black-atom/core`, update both the JSR and npm entries in
`deno.json`.
