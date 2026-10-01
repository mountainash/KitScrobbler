import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SAFARI_ICON_SIZES } from "./assets";
import { manifestPath, root } from "./paths";

interface PackageJson {
	version?: string;
}

interface Manifest {
	name?: string;
	version?: string;
	description?: string;
	icons?: Record<string, string>;
	action?: { default_icon?: Record<string, string> };
	[key: string]: unknown;
}

/** Toolbar sizes Safari asks for; all point at the Safari icon we ship. */
const ACTION_ICON_SIZES = [16, 19, 32, 38] as const;

function safariIcon(size: number): string {
	return `icons/icon_safari_${size}.png`;
}

/**
 * Rewrites the *generated* manifest in the preview extension so it presents as
 * Kit Scrobbler. The manifest is produced by upstream's Vite plugin from
 * `manifest.config.ts`; we only patch the build output, never the submodule.
 *
 * The icon entries are repointed at the Safari artwork: upstream's manifest
 * names the canvas-rendered `icons/icon_main_*.png`, which we no longer build.
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

	manifest.icons = Object.fromEntries(
		SAFARI_ICON_SIZES.map((size) => [String(size), safariIcon(size)]),
	);
	if (manifest.action) {
		manifest.action.default_icon = Object.fromEntries(
			ACTION_ICON_SIZES.map((size) => [String(size), safariIcon(48)]),
		);
	}

	writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
	console.log("• Patched manifest.json (name, version, Safari icons).");
}
