import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { scriptBuildOptions } from "./build-ui";
import { appDir, previewDir } from "./paths";

/** Kit's background script; the manifest names it as `background/kit.js`. */
const BACKGROUND_ENTRY = join(appDir, "background", "kit.ts");

/**
 * Bundles Kit's own background script alongside upstream's.
 *
 * Background scripts are classic scripts, so this one is built as an IIFE: no
 * module syntax may survive into the output.
 */
export async function buildBackgroundScript(): Promise<void> {
	mkdirSync(join(previewDir, "background"), { recursive: true });

	const result = await Bun.build({
		entrypoints: [BACKGROUND_ENTRY],
		root: appDir,
		outdir: previewDir,
		format: "iife",
		minify: true,
		naming: { entry: "[dir]/[name].js" },
		...scriptBuildOptions(false),
	});

	if (!result.success) {
		for (const log of result.logs) {
			console.error(log);
		}
		throw new Error("Failed to build the background script.");
	}
}
