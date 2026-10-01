import { buildUi } from "./build-ui";
import { patchManifest } from "./manifest";
import { buildUpstreamRaw } from "./upstream";
import { buildXcodeApp, packageApp } from "./xcode";

async function main(): Promise<void> {
	if (process.platform !== "darwin") {
		console.error(
			"✖ `bun run build` wraps the extension into a Safari app and needs macOS + Xcode.",
		);
		console.error(
			"  In this environment use `bun run dev` or `bun run build:ui`.",
		);
		process.exit(1);
	}

	console.log("Kit Scrobbler — Safari build\n");

	buildUpstreamRaw();
	await buildUi();
	patchManifest();
	const app = buildXcodeApp();
	packageApp(app);

	console.log("\n✔ Done.");
}

await main();
