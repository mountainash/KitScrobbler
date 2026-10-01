import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SAFARI_ICON_SIZES } from "./assets";
import { connectorMatches } from "./matches";
import { manifestPath, root } from "./paths";

interface PackageJson {
	version?: string;
}

interface ContentScript {
	matches?: string[];
	js?: string[];
	all_frames?: boolean;
}

interface Manifest {
	name?: string;
	version?: string;
	description?: string;
	icons?: Record<string, string>;
	action?: { default_icon?: Record<string, string> };
	content_scripts?: ContentScript[];
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
 * Two changes:
 *
 * - icons are repointed at the Safari artwork, since upstream's manifest names
 *   the canvas-rendered `icons/icon_main_*.png` we no longer build;
 * - `content_scripts.matches` is narrowed from upstream's `<all_urls>` to the
 *   apex domains of the sites the connectors actually need (see `matches.ts`).
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

	reportMatches(manifest);

	writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
	console.log("• Patched manifest.json (name, version, Safari icons).");
}

function reportMatches(manifest: Manifest): void {
	const report = connectorMatches();

	for (const script of manifest.content_scripts ?? []) {
		script.matches = report.patterns;
	}

	console.log(
		`• content_scripts.matches: ${report.patterns.length} patterns from ${report.connectors} connectors (${report.hosts} hosts).`,
	);
	if (report.wildcardHostPatterns.length > 0) {
		console.log(
			`  • ${report.wildcardHostPatterns.length} path-limited "*" host patterns kept (self-hosted servers).`,
		);
	}
	if (report.unrepresentable.length > 0) {
		console.log(
			`  • ${report.unrepresentable.length} patterns cannot be expressed as match patterns (host/port/TLD wildcards).`,
		);
	}
	if (report.unreachableConnectors.length > 0) {
		console.warn(
			`  ⚠ left with no pattern at all: ${report.unreachableConnectors.join(", ")}`,
		);
	}
	if (report.httpOnlyConnectors.length > 0) {
		console.warn(
			`  ⚠ http-only connectors (no https): ${report.httpOnlyConnectors.join(", ")}`,
		);
	} else {
		console.log("  • no http-only connectors found.");
	}
}
