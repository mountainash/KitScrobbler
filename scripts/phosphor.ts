import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { root } from "./paths";

/**
 * The Phosphor weights Kit Scrobbler uses, and the file each is vendored as.
 *
 * Only the `woff2` is copied: it is the first source in the `@font-face`, so
 * Safari never requests the woff/ttf/svg fallbacks. The filled weight is a
 * separate font, needed for glyphs the regular weight only draws in outline —
 * the loved heart.
 */
const WEIGHTS = [
	{ source: "regular", font: "Phosphor.woff2", output: "style.css" },
	{ source: "fill", font: "Phosphor-Fill.woff2", output: "fill.css" },
] as const;

/**
 * Where we put them for our pages to `<link>` to.
 *
 * Bun's bundler (both the dev server and `Bun.build` HTML entries) resolves a
 * page's `<link href>` against the page itself, so the stylesheet cannot be
 * referenced out of `node_modules`. Copying it next to the pages keeps dev and
 * build identical. The directory is generated, and gitignored.
 */
export const PHOSPHOR_VENDOR_DIR = join(root, "app", "vendor", "phosphor");

/**
 * The package's `@font-face` lists woff2, woff, ttf and svg sources. We keep
 * only woff2 — otherwise all four would have to be shipped, and the SVG font
 * alone is ~3 MB.
 */
const FONT_SOURCES = /src:\s*[^;]*;/;

/** Copies the Phosphor stylesheets + fonts into `app/vendor/phosphor/`. */
export function ensurePhosphorAssets(): void {
	mkdirSync(PHOSPHOR_VENDOR_DIR, { recursive: true });

	for (const weight of WEIGHTS) {
		const dir = join(
			root,
			"node_modules",
			"@phosphor-icons",
			"web",
			"src",
			weight.source,
		);
		cpSync(join(dir, weight.font), join(PHOSPHOR_VENDOR_DIR, weight.font));

		const stylesheet = readFileSync(join(dir, "style.css"), "utf8");
		writeFileSync(
			join(PHOSPHOR_VENDOR_DIR, weight.output),
			stylesheet.replace(
				FONT_SOURCES,
				`src: url("./${weight.font}") format("woff2");`,
			),
		);
	}
}
