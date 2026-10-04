import { cpSync, mkdirSync } from "node:fs";
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

/**
 * Copies the images the extension needs into the preview.
 *
 * Without upstream's icon pipeline nothing populates `icons/` or `img/`, so we
 * stage our own artwork plus the one upstream image the controller hard-codes.
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

	const imgOut = join(previewDir, "img");
	mkdirSync(imgOut, { recursive: true });
	cpSync(IMG_SRC, imgOut, { recursive: true });
}
