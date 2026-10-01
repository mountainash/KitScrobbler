# AGENTS.md — Kit Scrobbler

Kit Scrobbler is an **Apple-first Safari extension** for scrobbling music to Last.fm (and other
services). It is a higher-level project built **around** the Web Scrobbler codebase, which is vendored
as a read-only git submodule at `src/web-scrobbler/`.

We are not trying to be a generic cross-platform scrobbler. We optimise for one thing: the best
possible scrobbling experience in **Safari on macOS**.

## Golden rules

1. **Never edit anything inside `src/web-scrobbler/`.**
   It is an upstream dependency. Read it, import it, learn from it — never modify it, and never add
   tracked files to it. All of Kit Scrobbler's own code lives outside that directory.
   `bun run guard` enforces this and runs on every commit.

2. **Bun is the build tool.**
   `Bun.build`, `Bun.serve`, Bun scripts and Bun plugins do the work. Upstream's own Vite/esbuild
   toolchain is used *only* as an interim step to produce the raw Safari web-extension bundle that we
   wrap. Do not add webpack/rollup/vite to our own pipeline.

3. **Apple experience only.**
   macOS Safari is the only target. No cross-platform fallbacks, no lowest-common-denominator UI.
   Use the newest web platform features Safari ships — CSS Nesting, `light-dark()`, `:has()`,
   `@starting-style`, the Popover API, native form controls (including `<input type="checkbox" switch>`).
   **Ship modern CSS as-is. No preprocessor, no transpilation, no polyfills for our own UI.**

4. **Kit Scrobbler owns its UI.**
   Our HTML/CSS/TS replaces upstream's popup and options pages. Everything else — background script,
   content scripts, the ~370 connectors, and all scrobbling logic — comes from `@upstream` untouched.

## Repository map

```
app/                  Kit Scrobbler's own source (our code — edit freely)
  popup/              Safari toolbar popup (now-playing etc.)
  options/            Settings page
  shared/             Design tokens, base components, upstream bridges
scripts/              Bun build pipeline
  plugins/            Bun.build plugins (upstream alias, #v-ifdef)
src/web-scrobbler/    READ-ONLY git submodule (upstream Web Scrobbler)
build/                Build output (gitignored)
dist/                 Packaged artifacts (gitignored)
```

Potential confusion to avoid: upstream's *own* source lives at `src/web-scrobbler/src/`. Our source is
`app/`. The `src/` at our repo root contains only the submodule.

## Environment

- **macOS + Xcode** is required for the full build (`bun run build`), because the raw Safari web
  extension is wrapped into a native app by `xcodebuild`.
- The **DevContainer is Linux (Bun)**. Inside it you can run `bun run dev`, `bun run build:ui`,
  `bun run typecheck`, `bun run check` and `bun run guard`. You cannot build, run or test the actual
  Safari extension there.

## Commands

| Command | Action |
| :--- | :--- |
| `bun install` | Install dependencies; `postinstall` initialises the submodule |
| `bun run dev` | Serve the UI at <http://localhost:3000> with live reload (no macOS needed) |
| `bun run build:ui` | Bun.build the popup + options into the raw Safari bundle |
| `bun run build` | Full macOS pipeline: raw bundle → our UI → manifest patch → Xcode app |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run check` | Biome lint + format check |
| `bun run fix` | Biome autofix |
| `bun run guard` | Fail if the submodule has uncommitted tracked changes |

## Import aliases

- `@kit/*` → `app/*` — our own code.
- `@upstream/*` → `src/web-scrobbler/*` — the submodule (e.g.
  `import type { ManagerTab } from '@upstream/src/core/storage/wrapper'`).
- `@/*` → upstream's *internal* alias for its own `src/`. It is **not** ours and is resolved by our
  Bun plugin (`scripts/plugins/upstream-alias.ts`) only for files inside the submodule. Never write
  `@/...` in `app/`.

**Import from upstream; never re-declare it.** Types come straight from the submodule
(`import type { ManagerTab } from "@upstream/src/core/storage/wrapper"`). Runtime code is reached
through `app/shared/upstream.ts`, which lazily imports upstream modules. The only reason anything is
imported dynamically is that `webextension-polyfill` throws at module-evaluation time outside an
extension — the lazy loader keeps `bun run dev` alive and returns `null` (preview) there. Do not copy
upstream logic, constants, or shapes into `app/`; unused code is tree-shaken at build.

Type-checking upstream source needs the submodule's dependencies. Run `npm ci` inside
`src/web-scrobbler` (the build does this automatically when `node_modules` is missing), and note that
`tsconfig.json` includes the submodule's ambient declarations (`src/web-scrobbler/src/**/*.d.ts`).

## Build pipeline

1. `scripts/upstream.ts` drives upstream's three Vite builds directly (background, content, popup +
   options) with `VITE_PROD`/`VITE_SAFARI` set, deliberately stopping **before** Xcode, and copies
   `build/safariraw` out of the submodule.
2. `scripts/build-ui.ts` runs `Bun.build` over `app/**` and writes our popup + options to the exact
   paths the generated manifest points at (`src/ui/popup/index.html`, `src/ui/options/index.html`).
   This is how we replace the UI without touching upstream.
   Only **TypeScript** goes through Bun.build. HTML and CSS are copied **verbatim**, because Bun's CSS
   pipeline rewrites `light-dark()` and flattens CSS Nesting — the exact modern CSS we insist on
   shipping as-is. So `index.html` references the built `./popup.js` directly and links its
   stylesheets explicitly (no `@import`).
3. The generated `manifest.json` is patched in-place in the build output (name/version/description).
4. `scripts/xcode.ts` runs upstream's `safari.sh`-equivalent Xcode build against our `safariraw` and
   copies the resulting app to `build/`.

## Upstream landmines (do not forget these)

- **Conditional compilation directives.** Upstream uses `vite-plugin-conditional-compiler`:
  `// #v-ifdef VITE_SAFARI` … `// #v-endif` (also `#v-ifdef-not`, `#v-else`) across ~12 files,
  including `src/core/storage/wrapper.ts`. Without processing, **both branches survive** and the code
  silently misbehaves. Our `scripts/plugins/v-ifdef.ts` handles these for any upstream file we bundle.
  When we import an upstream module, assume it may contain directives.
- **Connectors are loaded at runtime** via `await import(browser.runtime.getURL(\`connectors/${...}\`))`
  and are compiled by a *separate* esbuild pass into `connectors/*.js`. Never let a bundler try to
  statically resolve that import or inline the connectors directory.
- **The manifest is generated**, not a static file, and uses `_locales` message placeholders. Patch
  only the build output.
- **Never hand-edit `build/safariraw`.** It is regenerated; make changes in `app/` or `scripts/`.

## UI guidelines (Apple design system)

- Design tokens live in `app/shared/theme.css` as CSS custom properties, driven by
  `color-scheme: light dark` and the `light-dark()` function. Never hard-code a colour in a component.
- Compose from the primitives in `app/shared/base.css` (inset grouped lists, buttons, native switches).
- Typography uses the system font stack / Apple text styles. Spacing follows a 4/8 pt grid; corners
  are 10–12px; separators are hairlines.
- Favour **native controls** — real `<input type="checkbox" switch>`, `<select>`, `<input type="range">`
  with `accent-color`. Do not recreate iOS/macOS controls with custom markup if a native one exists.
- The accent colour is the system accent (`AccentColor`) wherever possible.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/) (matches upstream's `AGENTS.md`).
Keep the submodule pointer update as its own commit when you bump it.
