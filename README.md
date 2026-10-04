# Kit Scrobbler

![Kit Scrobbler icon](./app/icons/kit-scrobbler-256.png)

> An Apple-first Safari extension for scrobbling music plays to [Last.fm](https://www.last.fm/).

## 💁 About

Kit Scrobbler is narrowly scoped to be the best extension for scrobbling music in **Safari on macOS**. It is not a generic cross-platform scrobbler and it does not try to be. Everything here is tuned for Apple's webkit browser and Apple's design language.

It is built *around* the [Web Scrobbler](https://github.com/web-scrobbler/web-scrobbler) codebase — connectors and playback logic — which is vendored as a **read-only git submodule** at `src/web-scrobbler/`. Kit Scrobbler uses its own Bun-powered build pipeline and its own Apple-styled UI on top.

## 🧩 Extension Installation

1. Download the Zip from the [releases page](https://github.com/mountainash/KitScrobbler/releases/latest)
1. Unzip the downloaded file in a location where you can easily access it
1. Open Safari
1. Enable the **Show features for web developers** option in Safari's **Advanced** settings tab
1. Navigate to **Settings → Developer → Add Temporary Extension…** and select the unzipped extension folder
1. Navigate to the **Extensions** tab in Safari to see the temporary extension loaded and active it
1. Click the extension's **Settings** button to login to Last.fm and configure other settings as desired
1. Visit a supported online music service, like [SoundCloud](https://soundcloud.com)
1. Click the new Kit Scrobbler toolbar button once to approve permissions
1. Enjoy scrobbling your music plays to Last.fm!

## 🗂 Project Layout

```text
📁 app/                 Kit Scrobbler's own source: popup, options, design system
📁 scripts/             The Bun build pipeline
📁 src/web-scrobbler/   Upstream submodule — **never edit this**
```

## 🧑‍💻 Development

See [AGENTS.md](./AGENTS.md) for the project constitution (the rules an automated agent — or a human — should follow).

Run this project inside a DevContainer in VS Code. After reopening the folder in the container, needed dependencies are installed automatically. NOTE: xcode build will not be possible inside the Linux-based DevContainer.

| Command | Action |
| :--- | :--- |
| `bun install` | Install dependencies, fetch the Web Scrobbler submodule and its dependencies |
| `bun run dev` | Bun dev server with HMR: gallery at <http://localhost:3000/popup/dev.html> (see "Popup state gallery" below) |
| `bun run build:ui` | Bundle the popup + options into `build/preview` |
| `bun run build` | Build the loadable extension into `build/preview` (any OS) |
| `bun run build:release` | The same build without the popup state gallery — what the release workflow ships |
| `bun run bundle` | Archive + export the App Store build to `dist/` (macOS + Xcode) |
| `bun run check` | Lint + format check with Biome |
| `bun run fix` | Biome autofix |
| `bun run guard` | Verify the upstream submodule has not been modified |

### 🖼 UI Helper: Popup state gallery

`bun run dev` then open <http://localhost:3000/popup/dev.html> to see renders every popup.html state side-by-side in iframes, so you can compare them without a browser session for each.

## 🎨 UI principles

- Apple design tokens (spacing, corners, colours, type) live in `app/shared/theme.css` and are driven by `color-scheme` + `light-dark()` — no duplicated dark-mode rules.
- Modern CSS only: **CSS Nesting**, `:has()`, `@starting-style`, popovers. There is no preprocessor and no transpilation step for our styles.
- Native controls first: real `<input type="checkbox" switch>`, `<select>`, `<input type="range">` using `accent-color`.

### 🏗 Building the extension

Building is two steps:

1. **`bun run build`** produces the loadable extension at `build/preview`. This is a plain web extension folder, so you can run it without Xcode: in Safari open **Settings → Advanced**, tick **Show features for web developers**, then in the **Developer** tab click **Add Temporary Extension…** and choose `build/preview`.
2. **`bun run bundle`** wraps the same bundle in its native host app, archives it with `xcodebuild` and exports it to `dist/` for the App Store. This step needs **macOS + Xcode** and a signing identity.

`bun run build` needs upstream's native libraries: `brew install pango` on macOS, or the cairo/pango development packages on Linux.

### 📦 Dependency Updates

- `bun update --interactive` to update dependencies interactively
- `bun biome migrate` to update Biome configuration and dependencies

## 📚 Resources

- [KitScrobbler Toolbar icons](./README-TOOLBAR-ICONS.md) - what the icons represent
- [Biome](https://biomejs.dev)
- [Bun](https://bun.sh)
- [Phosphor Icons](https://phosphoricons.com/)
- [Apple Developer: Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions/)

## ☑️ TODO

See [GitHub Issues](https://github.com/mountainash/KitScrobbler/issues).
