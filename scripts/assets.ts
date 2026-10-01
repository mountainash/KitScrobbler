import { cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { previewDir, upstreamDir } from "./paths";

/**
 * The Safari artwork we ship, straight from upstream's `src/icons/`.
 *
 * Upstream renders its icon set from `src/icons/{main,monochrome}` with native
 * canvas (see `upstream-driver.ts`, which skips that plugin); Kit Scrobbler uses
 * these checked-in Safari PNGs instead.
 */
export const SAFARI_ICON_SIZES = [48, 96, 128, 256, 512] as const;

const ICONS_SRC = join(upstreamDir, "src", "icons");
const IMG_SRC = join(upstreamDir, "src", "img", "main");

/**
 * Copies the images the extension needs into the preview.
 *
 * Without upstream's icon pipeline nothing populates `icons/` or `img/`, so we
 * stage them: the Safari icons for the manifest/toolbar, and upstream's images
 * for the in-page info box and scrobble notifications.
 */
export function stageSafariAssets(): void {
	const iconsOut = join(previewDir, "icons");
	mkdirSync(iconsOut, { recursive: true });
	for (const size of SAFARI_ICON_SIZES) {
		cpSync(
			join(ICONS_SRC, `icon_safari_${size}.png`),
			join(iconsOut, `icon_safari_${size}.png`),
		);
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
