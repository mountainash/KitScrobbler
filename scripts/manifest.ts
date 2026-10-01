import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { manifestPath, root } from "./paths";

interface PackageJson {
	version?: string;
}

interface Manifest {
	name?: string;
	version?: string;
	description?: string;
	[key: string]: unknown;
}

/**
 * Rewrites the *generated* manifest in the preview extension so it presents as
 * Kit Scrobbler. The manifest is produced by upstream's Vite plugin from
 * `manifest.config.ts`; we only patch the build output, never the submodule.
 */
export function patchManifest(): void {
	const pkg = JSON.parse(
		readFileSync(join(root, "package.json"), "utf8"),
	) as PackageJson;

	const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;

	manifest.name = "Kit Scrobbler";
	if (pkg.version) {
		manifest.version = pkg.version;
	}

	writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
	console.log("• Patched manifest.json (name/version).");
}
