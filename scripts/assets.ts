import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { ACTION_ICONS } from "../app/shared/action-icon";
import { appDir, previewDir, upstreamDir } from "./paths";

/** Kit's app artwork: the logo the manifest names. */
export const KIT_LOGO = "kit-scrobbler.svg";

/** Everything `stageSafariAssets` copies in, the toolbar set included. */
const KIT_ICON_FILES = [KIT_LOGO, ...new Set(Object.values(ACTION_ICONS))];

const ICONS_SRC = join(upstreamDir, "src", "icons");
const IMG_SRC = join(upstreamDir, "src", "img", "main");
const KIT_ICONS_SRC = join(appDir, "icons");

/** Where upstream's Vite build put its own popup and options chunks. */
const UPSTREAM_UI_DIR = join(previewDir, "assets");

/** The upstream scripts that fetch images by name while running. */
const IMAGE_SOURCES = [
	join(previewDir, "background", "main.js"),
	join(previewDir, "content", "main.js"),
];

/**
 * Stages the assets the extension needs, and drops upstream's leftovers.
 *
 * Without upstream's image pipeline nothing populates `icons/` or `img/`, so we
 * stage our own artwork plus the few upstream images the controller asks for by
 * name. Upstream's own UI build output is dead weight: Kit replaces the popup
 * and options pages, so nothing references its chunks or the artwork that went
 * with them.
 */
export function stageSafariAssets(): void {
	const iconsOut = join(previewDir, "icons");
	mkdirSync(iconsOut, { recursive: true });
	for (const icon of KIT_ICON_FILES) {
		cpSync(join(KIT_ICONS_SRC, icon), join(iconsOut, icon));
	}
	// Upstream's in-page info box asks for this exact filename.
	cpSync(
		join(ICONS_SRC, "icon_safari_48.png"),
		join(iconsOut, "icon_main_48.png"),
	);

	rmSync(UPSTREAM_UI_DIR, { recursive: true, force: true });

	const imgOut = join(previewDir, "img");
	rmSync(imgOut, { recursive: true, force: true });
	mkdirSync(imgOut, { recursive: true });
	for (const image of referencedImages()) {
		cpSync(join(IMG_SRC, image), join(imgOut, image));
	}
}

/**
 * The images the shipped scripts ask for, e.g. `cover_art_default.png` for the
 * in-page info box. Reading them out of the bundles rather than listing them
 * keeps the extension in step with upstream: artwork we replaced is left behind,
 * and anything it starts fetching still gets copied.
 */
function referencedImages(): string[] {
	const names = new Set<string>();
	const reference = /img\/([A-Za-z0-9._-]+)/g;

	for (const source of IMAGE_SOURCES) {
		for (const match of readFileSync(source, "utf8").matchAll(reference)) {
			names.add(match[1]);
		}
	}

	return [...names];
}
