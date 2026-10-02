import { cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { appDir, previewDir, upstreamDir } from "./paths";

/**
 * Kit Scrobbler's own artwork, kept as SVG so one file covers every size (this
 * is what Apple's sample extension does with its `icons` entry).
 *
 * The two toolbar icons mirror upstream's per-mode set in a single pair:
 * `unsupported` when nothing is playing, `recording` while a track does.
 */
export const KIT_ICONS = {
	logo: "kit-scrobbler.svg",
	unsupported: "kit-scrobbler-unsupported.svg",
	recording: "kit-scrobbler-recording.svg",
} as const;

const ICONS_SRC = join(upstreamDir, "src", "icons");
const IMG_SRC = join(upstreamDir, "src", "img", "main");
const KIT_ICONS_SRC = join(appDir, "icons");

/**
 * Copies the images the extension needs into the preview.
 *
 * Without upstream's icon pipeline nothing populates `icons/` or `img/`, so we
 * stage our own artwork plus the one upstream image the controller hard-codes.
 */
export function stageSafariAssets(): void {
	const iconsOut = join(previewDir, "icons");
	mkdirSync(iconsOut, { recursive: true });
	for (const icon of Object.values(KIT_ICONS)) {
		cpSync(join(KIT_ICONS_SRC, icon), join(iconsOut, icon));
	}
	// Upstream's in-page info box asks for this exact filename.
	cpSync(
		join(ICONS_SRC, "icon_safari_48.png"),
		join(iconsOut, "icon_main_48.png"),
	);

	const imgOut = join(previewDir, "img");
	mkdirSync(imgOut, { recursive: true });
	cpSync(IMG_SRC, imgOut, { recursive: true });
}
