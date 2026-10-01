/**
 * Produces upstream's raw Safari web-extension bundle **without** invoking Xcode.
 *
 * This is executed by upstream's own `tsx` with `cwd` set to `src/web-scrobbler`,
 * because upstream's Vite configs read `process.argv` at import time and resolve
 * everything relative to that directory.
 *
 * We drive the three Vite builds ourselves instead of running upstream's
 * `build.ts`, because `build.ts` unconditionally shells out to `safari.sh`
 * (Xcode) for the Safari target whenever it is not a dev build — and we must
 * overlay our own UI *before* Xcode runs.
 */
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const upstream = process.cwd();

process.env.VITE_PROD = "true";
process.env.VITE_SAFARI = "true";
delete process.env.VITE_DEV;
delete process.env.VITE_TEST;

// `scripts/util.ts` reads these at module load: releaseType = argv.at(-2),
// releaseTarget = argv.at(-1). 'dist' + 'safari' gives a minified Safari build.
process.argv = [
	process.argv[0] ?? "node",
	join(upstream, "build.ts"),
	"dist",
	"safari",
];

const viteEntry = join(
	upstream,
	"node_modules",
	"vite",
	"dist",
	"node",
	"index.js",
);
const { build } = (await import(pathToFileURL(viteEntry).href)) as {
	build: (config: unknown) => Promise<unknown>;
};

const configs = (await import(
	pathToFileURL(join(upstream, "vite.configs.ts")).href
)) as {
	buildStart: unknown;
	buildBackground: unknown;
	buildContent: unknown;
};

await Promise.all([
	build(configs.buildStart),
	build(configs.buildBackground),
	build(configs.buildContent),
]);
