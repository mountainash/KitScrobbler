import { stageSafariAssets } from "./assets";
import { buildUi } from "./build-ui";
import { patchManifest } from "./manifest";
import { previewDir } from "./paths";
import { buildUpstreamRaw } from "./upstream";

export interface BuildPreviewOptions {
	/** Include the popup state gallery. Defaults to true. */
	includeDev?: boolean;
}

/**
 * Produces the loadable extension at `build/preview`.
 *
 * This is a plain, complete Safari web extension folder — the same shape a
 * shipped extension has in Firefox/Chromium — so Safari can load it straight
 * from disk ("Add Temporary Extension"). No Xcode, no macOS.
 */
export async function buildPreview(
	options: BuildPreviewOptions = {},
): Promise<string> {
	buildUpstreamRaw();
	await buildUi({ includeDev: options.includeDev });
	stageSafariAssets();
	patchManifest();
	return previewDir;
}

if (import.meta.main) {
	console.log("Kit Scrobbler — preview extension\n");

	const dir = await buildPreview();

	console.log(`\n✔ Preview extension ready: ${dir}`);
	console.log(`  Popup state gallery: ${dir}/src/ui/popup/dev.html`);
	console.log("\n  Load it in Safari:");
	console.log(
		"    Safari → Settings → Advanced → Show features for web developers",
	);
	console.log(
		"    Developer tab → Add Temporary Extension… → choose the folder above",
	);
}
