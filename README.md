# Kit Scrobbler

> An Apple-first Safari extension for scrobbling music tracks to [Last.fm](https://www.last.fm) and friends.

## 💁 About

Kit Scrobbler is narrowly scooped to be the best tool for scrobbling music in **Safari on macOS**.
It is not a generic cross-platform scrobbler and it does not try to be. Everything here is tuned for
Apple's browser and Apple's design language.

It is built *around* the [Web Scrobbler](https://github.com/web-scrobbler/web-scrobbler) codebase —
its scrobblers, connectors and playback logic — which is vendored as a **read-only git submodule** at
`src/web-scrobbler/`. Kit Scrobbler contributes its own Bun-powered build pipeline and its own
Apple-styled UI on top.

See [AGENTS.md](./AGENTS.md) for the project constitution (the rules an automated agent — or a human —
must follow).

## 🗂 Layout

| Path | What it is |
| :--- | :--- |
| `app/` | Kit Scrobbler's own source: popup, options, design system |
| `scripts/` | The Bun build pipeline |
| `src/web-scrobbler/` | The upstream submodule — **never edit this** |

## 🧑‍💻 Local Development

Run these commands from the repository root.

| Command | Action |
| :--- | :--- |
| `bun install` | Install dependencies |
| `bun run dev` | Serve the UI preview at <http://localhost:3000> with live reload |
| `bun run build:ui` | Bundle the popup + options into the raw Safari bundle |
| `bun run build` | Full build: raw bundle → Kit UI → manifest patch → Xcode app (macOS only) |
| `bun run typecheck` | Type-check with `tsc` |
| `bun run check` | Lint + format check with Biome |
| `bun run fix` | Biome autofix |
| `bun run guard` | Verify the upstream submodule has not been modified |

### 🍎 The macOS bits

`bun run dev` and `bun run build:ui` work anywhere Bun does, including the DevContainer — the UI falls
back to mock data outside an extension context, so you can iterate on the Apple design system directly.

`bun run build` produces the actual `.app` and therefore needs **macOS + Xcode**. It runs the vendored
upstream toolchain to emit a raw Safari web extension, replaces its popup and options pages with ours,
patches the generated manifest, and wraps the result into a native app with `xcodebuild`.

You can also run this project inside a DevContainer in VS Code. After reopening the folder in the
container, dependencies are installed automatically.

## 🎨 UI principles

- Apple design tokens (spacing, corners, colours, type) live in `app/shared/theme.css` and are driven
  by `color-scheme` + `light-dark()` — no duplicated dark-mode rules.
- Modern CSS only: **CSS Nesting**, `:has()`, `@starting-style`, popovers. There is no preprocessor
  and no transpilation step for our styles.
- Native controls first: real `<input type="checkbox" switch>`, `<select>`, `<input type="range">`
  with `accent-color`.

## 🔗 URLs

- <http://localhost:3000/>

### 📦 Dependency Updates

- `bun update --interactive` to update dependencies interactively
- `bun biome migrate` to update Biome configuration and dependencies

## 📚 Resources

- [Biome](https://biomejs.dev)
- [Bun](https://bun.sh)

## ☑️ TODO

See [GitHub Issues](https://github.com/mountainash/KitScrobbler/issues).
