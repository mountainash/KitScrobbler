import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { connectorMatches } from "../app/shared/connector-matches";
import { KIT_ICONS } from "./assets";
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

/**
 * Apple's sample extension names a single SVG for `icons` and lets Safari scale
 * it, so Kit Scrobbler ships one logo instead of a set of PNGs.
 */
const APP_ICON_PATH = `icons/${KIT_ICONS.logo}`;

/** Toolbar sizes Safari asks for; the background script swaps in the other one. */
const ACTION_ICON_SIZES = [16, 19, 32, 38] as const;

/** The toolbar's resting state, before any tab reports a track. */
const ACTION_ICON_PATH = `icons/${KIT_ICONS.unsupported}`;

/** Kit's background hook, written by `buildBackgroundScript`. */
const ACTION_ICON_SCRIPT = "background/kit.js";

/**
 * Rewrites the *generated* manifest in the preview extension so it presents as
 * Kit Scrobbler. The manifest is produced by upstream's Vite plugin from
 * `manifest.config.ts`; we only patch the build output, never the submodule.
 *
 * Changes:
 *
 * - icons point at Kit's own artwork (`app/icons/*.svg`): upstream's manifest
 *   names the canvas-rendered `icons/icon_main_*.png` and a per-mode action icon
 *   set that we no longer build;
 * - Kit's action-icon hook is added ahead of upstream's background script, so it
 *   can swap the toolbar icon on every controller update;
 * - `content_scripts.matches` is narrowed from upstream's `<all_urls>` to the
 *   apex domains of the sites the connectors actually need (see
 *   `app/shared/connector-matches.ts`).
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

	manifest.icons = { "512": APP_ICON_PATH };
	if (manifest.action) {
		manifest.action.default_icon = Object.fromEntries(
			ACTION_ICON_SIZES.map((size) => [String(size), ACTION_ICON_PATH]),
		);
	}

	registerActionIconHook(manifest);

	reportMatches(manifest);

	writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
	console.log("• Patched manifest.json (name, version, Kit icons).");
}

/**
 * Runs Kit's action-icon hook before upstream's background script, so the toolbar
 * icon is already wrapped when the controller sends its first update.
 */
function registerActionIconHook(manifest: Manifest): void {
	const background = manifest.background as { scripts?: string[] } | undefined;
	if (!background?.scripts) {
		console.warn(
			"  ⚠ manifest has no background.scripts; the toolbar icon will not change state.",
		);
		return;
	}

	background.scripts = [
		ACTION_ICON_SCRIPT,
		...background.scripts.filter((script) => script !== ACTION_ICON_SCRIPT),
	];
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
	console.log(
		`  • ${report.connectors - report.unreachableConnectors.length - report.partialConnectors.length} connectors fully covered.`,
	);
	if (report.partialConnectors.length > 0) {
		console.log(
			`  • ${report.partialConnectors.length} connectors partially covered (some patterns cannot be expressed).`,
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
