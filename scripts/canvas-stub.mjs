/**
 * Stub for upstream's `canvas` dependency.
 *
 * Upstream's `scripts/generate-icons.ts` imports canvas at module load, and
 * `vite.configs.ts` imports that module — so merely loading the configs pulls in
 * the native binding. Kit Scrobbler skips the icon plugin entirely and ships
 * upstream's pre-rendered Safari PNGs instead, so canvas is never used (and it
 * will not even build on Linux without cairo/pango).
 *
 * See `canvas-stub-hooks.mjs`, registered by `upstream-driver.ts`.
 */
const MESSAGE = "Kit Scrobbler builds do not use the canvas icon pipeline";

export function createCanvas() {
	throw new Error(MESSAGE);
}

export async function loadImage() {
	throw new Error(MESSAGE);
}
