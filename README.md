# Kit Scrobbler

![Kit Scrobbler icon](./app/icons/kit-scrobbler-256.png)

> An Apple-first Safari extension for scrobbling music plays to [Last.fm](https://www.last.fm).

## 💁 About

Kit Scrobbler is narrowly scooped to be the best tool for scrobbling music in **Safari on macOS**.
It is not a generic cross-platform scrobbler and it does not try to be. Everything here is tuned for
Apple's browser and Apple's design language.

It is built *around* the [Web Scrobbler](https://github.com/web-scrobbler/web-scrobbler) codebase — connectors and playback logic — which is vendored as a **read-only git submodule** at
`src/web-scrobbler/`. Kit Scrobbler contributes its own Bun-powered build pipeline and its own
Apple-styled UI on top.

See [AGENTS.md](./AGENTS.md) for the project constitution (the rules an automated agent — or a human —
must follow).

## 🗂 Layout

```text
📁 app/                 Kit Scrobbler's own source: popup, options, design system
📁 scripts/             The Bun build pipeline
📁 src/web-scrobbler/   Upstream submodule — **never edit this**
```

## 🧑‍💻 Local Development

Run these commands from the repository root.

| Command | Action |
| :--- | :--- |
| `bun install` | Install dependencies, fetch the Web Scrobbler submodule and its dependencies |
| `bun run dev` | Bun dev server with HMR: gallery at <http://localhost:3000/popup/dev.html> |
| `bun run build:ui` | Bundle the popup + options into `build/preview` |
| `bun run build` | Build the loadable extension into `build/preview` (any OS) |
| `bun run bundle` | Archive + export the App Store build to `dist/` (macOS + Xcode) |
| `bun run check` | Lint + format check with Biome |
| `bun run fix` | Biome autofix |
| `bun run guard` | Verify the upstream submodule has not been modified |

### 🏗 Building the extension

Building is two steps:

1. **`bun run build`** produces the loadable extension at `build/preview`. This is a plain web
   extension folder, so you can run it without Xcode: in Safari open **Settings → Advanced**, tick
   **Show features for web developers**, then in the **Developer** tab click **Add Temporary
   Extension…** and choose `build/preview`.
2. **`bun run bundle`** wraps the same bundle in its native host app, archives it with `xcodebuild`
   and exports it to `dist/` for the App Store. This step needs **macOS + Xcode** and a signing
   identity.

`bun run build` needs upstream's native libraries: `brew install pango` on macOS, or the cairo/pango
development packages on Linux.

### 🖼 Popup state gallery

`build/preview/src/ui/popup/dev.html` renders every popup state side by side in iframes, so you can
compare them without a browser session for each. Individual states are addressable directly, e.g.
`popup/index.html?state=loved`. The gallery is left out of `bun run bundle`.

`bun run dev` works anywhere Bun does, including the DevContainer — it serves the gallery from source
through Bun's development server, so edits hot-reload in the browser (at
<http://localhost:3000/popup/dev.html>), and the UI falls back to mock data outside an extension.

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
- [Phosphor Icons](https://phosphoricons.com/)

## ☑️ TODO

See [GitHub Issues](https://github.com/mountainash/KitScrobbler/issues).
