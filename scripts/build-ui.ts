import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { appDir, previewDir } from "./paths";
import { ensurePhosphorAssets, PHOSPHOR_VENDOR_DIR } from "./phosphor";
import { upstreamAlias } from "./plugins/upstream-alias";
import { vIfdef } from "./plugins/v-ifdef";

export interface BuildUiOptions {
	/** Where to write the bundled pages. Defaults to `<preview>/src/ui`. */
	outdir?: string;
	minify?: boolean;
	sourcemap?: boolean;
	/** Include the popup state gallery (`dev.html`/`dev.js`). Defaults to true. */
	includeDev?: boolean;
}

const PAGES = ["popup", "options"] as const;
const SHARED_CSS = ["theme.css", "base.css"] as const;

/** Dev-only gallery, nested in the popup so its iframes resolve `index.html`. */
const DEV_DIR = join(appDir, "popup");
const DEV_ENTRY = join(DEV_DIR, "dev.ts");

/**
 * Writes a page's HTML with its entry script pointed at the built file.
 *
 * The source HTML references the TypeScript entry (`./popup.ts`) so Bun's dev
 * server can bundle it for HMR; the shipped page must reference the emitted JS.
 */
function copyHtml(from: string, to: string, entry: string): void {
	const html = readFileSync(from, "utf8").replace(`${entry}.ts`, `${entry}.js`);
	writeFileSync(to, html);
}

/**
 * Copies the CSS **verbatim** and the HTML with its entry rewritten.
 *
 * Bun's bundler rewrites `light-dark()` and flattens CSS Nesting, which is
 * precisely the modern CSS we want to ship untouched. So only TypeScript goes
 * through Bun.build; styles are copied as-is and markup keeps everything else.
 */
function copyStatic(outdir: string, includeDev: boolean): void {
	const sharedOut = join(outdir, "shared");
	mkdirSync(sharedOut, { recursive: true });
	for (const file of SHARED_CSS) {
		cpSync(join(appDir, "shared", file), join(sharedOut, file));
	}

	const vendorOut = join(outdir, "vendor", "phosphor");
	mkdirSync(vendorOut, { recursive: true });
	cpSync(PHOSPHOR_VENDOR_DIR, vendorOut, { recursive: true });

	for (const page of PAGES) {
		const pageOut = join(outdir, page);
		mkdirSync(pageOut, { recursive: true });
		copyHtml(
			join(appDir, page, "index.html"),
			join(pageOut, "index.html"),
			page,
		);
		cpSync(join(appDir, page, `${page}.css`), join(pageOut, `${page}.css`));
	}

	if (includeDev) {
		copyHtml(
			join(DEV_DIR, "dev.html"),
			join(outdir, "popup", "dev.html"),
			"dev",
		);
		cpSync(join(DEV_DIR, "dev.css"), join(outdir, "popup", "dev.css"));
	}
}

/**
 * Bundles Kit Scrobbler's popup and options pages with Bun.build.
 *
 * `root` is `app/`, so the entries land at the exact paths upstream's generated
 * manifest expects: `src/ui/popup/index.html` and `src/ui/options/index.html`.
 * That is how we replace the UI without touching the submodule.
 */
export async function buildUi(options: BuildUiOptions = {}) {
	const { minify = true, sourcemap = false, includeDev = true } = options;
	const outdir = options.outdir ?? join(previewDir, "src", "ui");
	mkdirSync(outdir, { recursive: true });

	const entrypoints = PAGES.map((page) => join(appDir, page, `${page}.ts`));
	if (includeDev) {
		entrypoints.push(DEV_ENTRY);
	}

	const result = await Bun.build({
		entrypoints,
		root: appDir,
		outdir,
		target: "browser",
		format: "esm",
		// Everything ships locally inside the extension, so splitting shared code
		// into separately-fetched chunks buys nothing. Each page becomes one file.
		splitting: false,
		minify,
		sourcemap,
		naming: {
			entry: "[dir]/[name].js",
		},
		define: {
			// `includeDev` decides whether the popup's dev-state harness survives:
			// the popup gates it on `process.env.NODE_ENV !== "production"` so that
			// Bun's dev server (which substitutes NODE_ENV but not our own defines)
			// behaves the same way.
			"process.env.NODE_ENV": includeDev ? '"development"' : '"production"',
			"process.env.VITE_PROD": '"true"',
			"process.env.VITE_SAFARI": '"true"',
		},
		plugins: [upstreamAlias(), vIfdef(["VITE_SAFARI", "VITE_PROD"])],
	});

	if (!result.success) {
		for (const log of result.logs) {
			console.error(log);
		}
		throw new Error("Failed to build the UI.");
	}

	ensurePhosphorAssets();
	copyStatic(outdir, includeDev);
	return result;
}

if (import.meta.main) {
	await buildUi({ sourcemap: true });
	console.log(`• Built UI into ${join(previewDir, "src", "ui")}`);
}
