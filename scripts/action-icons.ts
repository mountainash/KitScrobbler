import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	ACTION_ICON_SIZES,
	ACTION_ICONS,
	actionIconFile,
} from "../app/shared/action-icon";
import { KIT_LOGO } from "./assets";
import { appDir, previewDir } from "./paths";

/**
 * The in-page info box hard-codes this filename for the mark it shows beside the
 * state text (`controller.ts`), so it is rendered from Kit's logo rather than
 * copied out of upstream's icon set.
 */
const INFO_BOX_ICON = { name: "icon_main_48.png", size: 48 };

/**
 * Renders the artwork to the PNGs Safari asks for.
 *
 * `action.setIcon` needs a bitmap and `Bun.Image` cannot decode SVG, so each file
 * is drawn in a headless WebView: the page loads the SVG into a canvas at the
 * requested size and hands back a PNG, which keeps the transparency the artwork
 * relies on. The page does all the work, so nothing here depends on the DevTools
 * protocol — the default WebKit backend on macOS behaves like Chrome elsewhere.
 */
export async function buildActionIcons(): Promise<void> {
	const iconsOut = join(previewDir, "icons");
	mkdirSync(iconsOut, { recursive: true });

	const view = openView();
	try {
		await view.navigate("data:text/html,<html><body></body></html>");

		const logo = readFileSync(join(appDir, "icons", KIT_LOGO), "utf8");
		const infoBox = await renderSizes(view, logo, [INFO_BOX_ICON.size]);
		writeFileSync(
			join(iconsOut, INFO_BOX_ICON.name),
			infoBox[INFO_BOX_ICON.size],
		);

		for (const [mode, source] of Object.entries(ACTION_ICONS)) {
			const svg = readFileSync(join(appDir, "icons", source), "utf8");
			const renders = await renderSizes(view, svg, ACTION_ICON_SIZES);

			for (const size of ACTION_ICON_SIZES) {
				writeFileSync(
					join(iconsOut, actionIconFile(mode, size)),
					renders[size],
				);
			}
		}
	} finally {
		view.close();
	}
}

/**
 * @returns a browser to render in, with a message that says what to install when
 * the runtime cannot find one.
 */
function openView(): Bun.WebView {
	try {
		return new Bun.WebView();
	} catch (error) {
		throw new Error(
			`Could not start a browser to render the toolbar icons. macOS uses the system WebKit; elsewhere set BUN_CHROME_PATH to a Chrome/Chromium binary. (${error})`,
			{ cause: error },
		);
	}
}

/**
 * Draws an SVG at each requested size.
 *
 * @returns the PNG bytes per size.
 */
async function renderSizes(
	view: Bun.WebView,
	svg: string,
	sizes: readonly number[],
): Promise<Record<number, Uint8Array>> {
	const base64 = (await view.evaluate(`(async () => {
		const img = new Image();
		img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(${JSON.stringify(svg)});
		await img.decode();

		const out = {};
		for (const size of ${JSON.stringify(sizes)}) {
			const canvas = document.createElement("canvas");
			canvas.width = size;
			canvas.height = size;
			canvas.getContext("2d").drawImage(img, 0, 0, size, size);

			const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
			out[size] = btoa(String.fromCharCode(...new Uint8Array(await blob.arrayBuffer())));
		}
		return out;
	})()`)) as Record<string, string>;

	return Object.fromEntries(
		sizes.map((size) => [
			size,
			Uint8Array.from(atob(base64[size]), (char) => char.charCodeAt(0)),
		]),
	);
}
