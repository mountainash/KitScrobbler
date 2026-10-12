import { join } from "node:path";

/** Repository root. */
export const root = join(import.meta.dir, "..");

/** Kit Scrobbler's own source. */
export const appDir = join(root, "app");

/** The read-only upstream submodule. */
export const upstreamDir = join(root, "src", "web-scrobbler");

/** Upstream's own `src/` directory (what its internal `@/` alias points at). */
export const upstreamSrcDir = join(upstreamDir, "src");

/** Our build output directory (gitignored). */
export const buildDir = join(root, "build");

/**
 * The unpacked Safari web extension. This is a normal, loadable extension folder
 * — point Safari's "Add Temporary Extension" at it (or wrap it with `bundle`).
 */
export const previewDir = join(buildDir, "preview");

/** Where upstream's toolchain emits its raw Safari bundle. */
export const upstreamRawDir = join(upstreamDir, "build", "safariraw");

/** The generated manifest inside the preview extension. */
export const manifestPath = join(previewDir, "manifest.json");

/**
 * Kit Scrobbler's own Xcode project — the macOS host app and the Safari web
 * extension. It references the built extension inside {@link previewDir}, so
 * `bun run build` has to run before Xcode does.
 */
export const xcodeProjectDir = join(root, "apple-extension", "Kit Scrobbler");
export const xcodeProjectPath = join(
	xcodeProjectDir,
	"Kit Scrobbler.xcodeproj",
);

/** The shared scheme `bun run bundle` archives. */
export const xcodeScheme = "Kit Scrobbler";

/** Packaged distributables (gitignored). */
export const distDir = join(root, "dist");

/** The Xcode archive produced by `bun run bundle`. */
export const archivePath = join(buildDir, "KitScrobbler.xcarchive");

/** The export options plist written by `bun run bundle`. */
export const exportOptionsPath = join(buildDir, "ExportOptions.plist");

/** The driver script to produce the raw bundle. */
export const upstreamDriver = join(import.meta.dir, "upstream-driver.ts");
