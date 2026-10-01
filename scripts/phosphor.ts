import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { root } from "./paths";

/**
 * Where the Phosphor webfont lives in the package.
 *
 * Only the `woff2` is copied: it is the first source in the `@font-face`, so
 * Safari never requests the woff/ttf/svg fallbacks.
 */
const PACKAGE_DIR = join(
	root,
	"node_modules",
	"@phosphor-icons",
	"web",
	"src",
	"regular",
);

/**
 * Where we put it for our pages to `<link>` to.
 *
 * Bun's bundler (both the dev server and `Bun.build` HTML entries) resolves a
 * page's `<link href>` against the page itself, so the stylesheet cannot be
 * referenced out of `node_modules`. Copying it next to the pages keeps dev and
 * build identical. The directory is generated, and gitignored.
 */
export const PHOSPHOR_VENDOR_DIR = join(root, "app", "vendor", "phosphor");

const FONT = "Phosphor.woff2";

/**
 * The package's `@font-face` lists woff2, woff, ttf and svg sources. We keep
 * only woff2 — otherwise all four would have to be shipped, and the SVG font
 * alone is ~3 MB.
 */
const FONT_SOURCES = /src:\s*[^;]*;/;

/** Copies the Phosphor stylesheet + font into `app/vendor/phosphor/`. */
export function ensurePhosphorAssets(): void {
	mkdirSync(PHOSPHOR_VENDOR_DIR, { recursive: true });

	cpSync(join(PACKAGE_DIR, FONT), join(PHOSPHOR_VENDOR_DIR, FONT));

	const stylesheet = readFileSync(join(PACKAGE_DIR, "style.css"), "utf8");
	writeFileSync(
		join(PHOSPHOR_VENDOR_DIR, "style.css"),
		stylesheet.replace(FONT_SOURCES, `src: url("./${FONT}") format("woff2");`),
	);
}
