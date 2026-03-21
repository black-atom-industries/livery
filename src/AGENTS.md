# Frontend (TypeScript / React / Deno)

The TypeScript frontend is the **orchestrator** — manages UI, state, and calling order. Decides
_what_ to do, then delegates to Rust via `invoke()`.

## Stack

- **Runtime:** Deno
- **Framework:** React (via Vite + `@deno/vite-plugin`)
- **Styling:** Tailwind CSS
- **State:** TanStack Query (server state), TanStack Store (client state)
- **Routing:** TanStack Router

## Conventions

> Full frontend conventions are pending — see
> [DEV-318](https://linear.app/black-atom-industries/issue/DEV-318).

- **Containers** (`src/containers/`): Own state, fetch data, orchestrate logic.
- **Components** (`src/components/`): Receive props, render UI. No data fetching.
- **Layouts** (`src/components/layouts/`): Page-level structure shells.
- One component/container per file. File name matches export.
- `kebab-case` for all files and directories.
- `.ts` for pure logic, `.tsx` for JSX.
- `deno fmt` — 4-space indent, double quotes, semicolons, 100 char width.
- Test files live next to code: `foo.ts` → `foo_test.ts`. Use `@std/assert`.
