import {
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
	ACTION_ICON_SIZES,
	ACTION_ICONS,
	actionIconFile,
} from "../app/shared/action-icon";
import { appDir, previewDir } from "./paths";

/**
 * Renders the toolbar SVGs to the PNGs Safari asks for.
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
	removeStaleIcons(iconsOut);

	const view = openView();
	try {
		await view.navigate("data:text/html,<html><body></body></html>");
		for (const [mode, source] of Object.entries(ACTION_ICONS)) {
			const svg = readFileSync(join(appDir, "icons", source), "utf8");
			const renders = await renderSizes(view, svg);

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

/** Drops earlier renders, so the set on disk matches {@link ACTION_ICONS}. */
function removeStaleIcons(iconsOut: string): void {
	for (const file of readdirSync(iconsOut)) {
		if (file.startsWith("action_") && file.endsWith(".png")) {
			rmSync(join(iconsOut, file));
		}
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
 * Draws an SVG at every size Safari asks for.
 *
 * @returns the PNG bytes for each size.
 */
async function renderSizes(
	view: Bun.WebView,
	svg: string,
): Promise<Record<number, Uint8Array>> {
	const base64 = (await view.evaluate(`(async () => {
		const img = new Image();
		img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(${JSON.stringify(svg)});
		await img.decode();

		const out = {};
		for (const size of ${JSON.stringify(ACTION_ICON_SIZES)}) {
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
		ACTION_ICON_SIZES.map((size) => [
			size,
			Uint8Array.from(atob(base64[size]), (char) => char.charCodeAt(0)),
		]),
	);
}
