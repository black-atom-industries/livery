# livery

> Paint your cockpit.

A desktop app for managing [Black Atom](https://github.com/black-atom-industries) themes across your
developer tools. Pick a theme once, apply it everywhere.

## Status

Early development. See the
[livery project](https://linear.app/black-atom-industries/project/livery-ebebb9cdaef9) for progress.

## Tech Stack

| Layer         | Technology                                  | Notes                                              |
| ------------- | ------------------------------------------- | -------------------------------------------------- |
| Runtime       | [Deno](https://deno.com/)                   | Dev server, formatting, linting, testing           |
| App shell     | [Tauri v2](https://tauri.app/)              | Rust + system webview                              |
| Frontend      | [React](https://react.dev/) 18              | Automatic JSX transform (`react-jsx`)              |
| Build         | [Vite](https://vite.dev/) 6                 | Via `deno run -A npm:vite`                         |
| Styling       | [Tailwind CSS](https://tailwindcss.com/) v4 | Vite plugin, no PostCSS config needed              |
| Theme data    | `@black-atom/core`                          | JSR package, resolved via npm compat layer in Vite |
| Config format | JSON                                        | `~/.config/black-atom/livery/config.json`          |

## Origin of Name

[Livery](https://en.wikipedia.org/wiki/Livery_(aircraft)) is the paint scheme of an aircraft - its
visual identity.

## Other Black Atom Utils

- [helm](https://github.com/black-atom-industries/helm) (tmux session and repo management)
- [radar.nvim](https://github.com/black-atom-industries/radar.nvim) — file nav

## License

MIT
