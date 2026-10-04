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
   toolchain is used *only* to produce the loadable Safari web extension. Do not add
   webpack/rollup/vite to our own pipeline.

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
  popup/              Safari toolbar popup (now-playing, edit view, state gallery)
  options/            Settings page
  shared/             Design tokens, base components, upstream bridges
  vendor/             Generated Phosphor webfont (gitignored; scripts/phosphor.ts)
scripts/              Bun build pipeline
  plugins/            Bun.build plugins (upstream alias, #v-ifdef)
src/web-scrobbler/    READ-ONLY git submodule (upstream Web Scrobbler)
build/preview/        The loadable extension (gitignored)
build/dev/            Dev-server output (gitignored)
dist/                 App Store artifacts (gitignored)
```

Potential confusion to avoid: upstream's *own* source lives at `src/web-scrobbler/src/`. Our source is
`app/`. The `src/` at our repo root contains only the submodule.

## Environment

- `bun run build` produces the **loadable extension** at `build/preview` and works anywhere Bun does,
  including this Linux DevContainer — we no longer use upstream's native image tooling (see below).
- `bun run bundle` archives and exports the App Store build, so it needs **macOS + Xcode** and a
  signing identity.

## Commands

| Command | Action |
| :--- | :--- |
| `bun install` | Install dependencies; `postinstall` fetches the submodule and its deps |
| `bun run dev` | Bun dev server with HMR, serving the gallery at <http://localhost:3000> (no macOS needed) |
| `bun run build:ui` | Bun.build the popup + options into `build/preview` |
| `bun run build` | Build the loadable extension into `build/preview` (any OS) |
| `bun run bundle` | Archive + export the App Store build to `dist/` (macOS + Xcode) |
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

Type-checking upstream source needs the submodule's dependencies; `bun install`'s postinstall installs
them with `bun i` (`scripts/setup.ts`), and the build ensures them too. `tsconfig.json` also includes
the submodule's ambient declarations (`src/web-scrobbler/src/**/*.d.ts`).

## Build pipeline

`bun run build` assembles the loadable extension in `build/preview`:

1. `scripts/upstream.ts` drives upstream's three Vite builds directly (background, content, popup +
   options) with `VITE_PROD`/`VITE_SAFARI` set — including its connector and icon steps — and copies
   the result out of the submodule.
2. `scripts/build-ui.ts` runs `Bun.build` over `app/**` and writes our popup + options to the exact
   paths the generated manifest points at (`src/ui/popup/index.html`, `src/ui/options/index.html`).
   This is how we replace the UI without touching upstream.
   Only **TypeScript** goes through Bun.build. CSS is copied **verbatim**, because Bun's CSS pipeline
   rewrites `light-dark()` and flattens CSS Nesting — the exact modern CSS we insist on shipping as-is.
   The HTML is copied with just its entry script rewritten (`./popup.ts` → `./popup.js`); the source
   points at the TypeScript entry so Bun's dev server can bundle it.
3. `scripts/background.ts` bundles Kit's own background script to `background/kit.js`; the manifest patch
   lists it ahead of upstream's background so its toolbar-icon hook is installed before the first update.
4. The generated `manifest.json` is patched in place: name, version, Kit's SVG icons, and
   `content_scripts.matches` narrowed from upstream's `<all_urls>`.
5. `scripts/assets.ts` stages the images upstream's build no longer produces: Kit's `app/icons/*.svg`, the
   one upstream PNG the controller hard-codes (`icon_main_48.png`), and `src/img/main/*` (in-page info box
   and scrobble notifications).

**Content-script scope.** Upstream matches `<all_urls>`, so its content script runs on every page.
`app/shared/connector-matches.ts` narrows that to the apex domain of every host the connectors declare
(`*://*.spotify.com/*`, …) — for context, 372 connectors collapse to ~510 patterns from 560 hosts.
Only `http`/`https` schemes are ever emitted. Three things to know:

- Connector patterns are written for upstream's *own* matcher, not the match-pattern grammar. Host
  wildcards in the middle, port wildcards and TLD wildcards (`music.amazon.*`) cannot be expressed,
  so they are dropped and reported — today that leaves `amazon` and `amazon-alexa` with no pattern.
- Self-hosted servers (Plex, Synology, Nextcloud, …) match *any* host by path; those are kept as
  path-limited `*` host patterns, which is as narrow as they can get.
- Because the manifest no longer matches everything, a user's **custom URL patterns could not inject
  the content script** — upstream relied on `<all_urls>` for that. The options page therefore no longer
  offers them at all. Widening this needs dynamic content-script registration, which is not
  implemented.

The build prints this report on every run, including any connector reachable over plain http only.
The options page reads the same `connectorMatches()` result, so it flags what the manifest does:
unreachable connectors render disabled with a link to the issue tracker, and partially covered ones
carry a note.

**Icons.** We do not render upstream's icon set. `upstream-driver.ts` drops two of its Vite plugins —
`generate-icons` (native canvas, renders `src/icons/{main,monochrome}` into `icon_main_*` and per-mode
`action_*` files) and `minify-images` (imagemin binaries) — and stubs `canvas` via a module hook
(`canvas-stub-hooks.mjs`), because merely importing the Vite configs would otherwise load it.

Kit's own artwork lives in `app/icons` as SVG, staged into `build/preview/icons` by `assets.ts`. The
manifest names a single SVG logo for `icons` (Apple's sample extension does the same) and the resting
toolbar icon for `action.default_icon`; upstream's one hard-coded image, `icons/icon_main_48.png` for
the in-page info box, is still staged from `src/icons/icon_safari_48.png`.

Upstream's `action.ts` drives the toolbar from the controller mode, asking for
`icons/action_<mode>_<size>_<theme>.png` on every update — files that no longer exist.
`app/shared/action-icon.ts` maps those modes onto the SVG set in `app/icons`: one file per mode, named for
the mode upstream asks for, with playing keeping the recording mark. `scripts/action-icons.ts` renders each
one to the PNG names Safari asks for (`Bun.Image` cannot decode SVG, so a `Bun.WebView` draws it into a
canvas page-side — that works on the macOS WebKit backend as well as Chrome), and `app/background/kit.ts`
(listed first in `background.scripts`) wraps `browser.action.setIcon` to draw it. Reading upstream's decision
rather than re-deriving it keeps us in step with the controller without touching the submodule, and no
`icon_main_*.png` set needs to be generated. `README-TOOLBAR-ICONS.md` documents what each state means.

`build/preview` is a plain, complete web extension folder — point Safari's Developer tab at it with
**Add Temporary Extension** to run it, exactly like loading an unpacked extension in Firefox/Chromium.

`bun run dev` (`bun --hot scripts/dev.ts`) is different in kind: it serves the pages straight from
`app/` through Bun's development server, so edits hot-reload in the browser and there is no
hand-rolled reload client. Bun bundles those pages itself, so it also touches the CSS (it adds
`--buncss-*` fallback variables; `light-dark()` itself is preserved, so the theme toggle still works).

`build/preview/src/ui/popup/dev.html` is a state gallery: `popup/index.html?state=<name>` forces a
specific popup state (fixtures live in `app/popup/dev-states.ts`) and the gallery lays them all out
side by side. `bun run dev` serves the same page at <http://localhost:3000/popup/dev.html>. The gallery
and its fixtures are compiled out of `bun run bundle`.

`bun run bundle` takes that same bundle, stages it inside the submodule where upstream's Xcode project
expects it, runs `xcodebuild archive`, and exports for the App Store. Configure the host app's bundle
identifiers, team and signing in the Xcode project (they cannot be set per-target from the CLI).

Pushing a `v*` tag runs `.github/workflows/release.yml`. It builds the release variant on Linux — the
runner image's Chrome renders the toolbar icons — zips `build/preview` to `KitScrobbler-<tag>.zip`, keeps
that zip as a run artifact, and opens a GitHub release attached to it whose notes list every commit since
the previous `v*` tag, with the short ref linked to the commit. That build is `bun run build:release`,
which is `bun run build` without the popup state gallery.

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
- **Never hand-edit `build/preview`.** It is regenerated; make changes in `app/` or `scripts/`.

## UI guidelines (Apple design system)

- Design tokens live in `app/shared/theme.css` as CSS custom properties, driven by
  `color-scheme: light dark` and the `light-dark()` function. Never hard-code a colour in a component.
- Compose from the primitives in `app/shared/base.css` (inset grouped lists, buttons, native switches).
- Typography uses the system font stack / Apple text styles. Spacing follows a 4/8 pt grid; corners
  are 10–12px; separators are hairlines.
- Favour **native controls** — real `<input type="checkbox" switch>`, `<select>`, `<input type="range">`
  with `accent-color`. Do not recreate iOS/macOS controls with custom markup if a native one exists.
- The accent colour is the system accent (`AccentColor`) wherever possible.
- Icons come from [Phosphor](https://phosphoricons.com/) through `app/shared/icons.ts`
  (`icon(name)` plus the `ICONS`/`SERVICE_ICONS` maps). Do not hand-roll SVG paths: upstream's icon
  pipeline needs native canvas/image tooling, whereas Phosphor is a webfont with no build step.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/) (matches upstream's `AGENTS.md`).
Keep the submodule pointer update as its own commit when you bump it.
