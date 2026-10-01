import { buildPreview } from "./build";
import { distDir } from "./paths";
import {
	assertCanBundle,
	createArchive,
	exportForAppStore,
	stagePreviewForXcode,
} from "./xcode";

/**
 * Produces an App Store build: the preview extension is wrapped in its native
 * host app, archived, and exported as a signed distributable.
 *
 * Requires macOS, Xcode and a signing identity. The host app's bundle
 * identifiers and team must be configured in the Xcode project (upstream's),
 * since they cannot be set meaningfully from the command line for two targets.
 */
async function main(): Promise<void> {
	assertCanBundle();

	console.log("Kit Scrobbler — App Store bundle\n");

	// No dev gallery in the shipped App Store bundle.
	const preview = await buildPreview({ includeDev: false });
	console.log(`• Preview extension: ${preview}`);

	stagePreviewForXcode();
	const archive = createArchive();
	exportForAppStore(archive);

	console.log(`\n✔ Archive: ${archive}`);
	console.log(`✔ Distributables: ${distDir}`);
}

await main();
