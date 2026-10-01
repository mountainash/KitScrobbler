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

/** Our copy of the raw Safari web-extension bundle that we wrap. */
export const rawDir = join(buildDir, "safariraw");

/** Packaged distributables (gitignored). */
export const distDir = join(root, "dist");

/** Where upstream's toolchain emits the raw Safari bundle. */
export const upstreamRawDir = join(upstreamDir, "build", "safariraw");

/** Where upstream's Xcode step emits the built app. */
export const upstreamAppDir = join(upstreamDir, "build", "safari");

/** The generated manifest inside our raw bundle. */
export const manifestPath = join(rawDir, "manifest.json");

/** The driver script upstream's own `tsx` runs to produce the raw bundle. */
export const upstreamDriver = join(import.meta.dir, "upstream-driver.ts");
