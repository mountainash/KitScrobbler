import { cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { appDir, rawDir } from "./paths";
import { upstreamAlias } from "./plugins/upstream-alias";
import { vIfdef } from "./plugins/v-ifdef";

export interface BuildUiOptions {
	/** Where to write the bundled pages. Defaults to `<safariraw>/src/ui`. */
	outdir?: string;
	minify?: boolean;
	sourcemap?: boolean;
}

const PAGES = ["popup", "options"] as const;
const SHARED_CSS = ["theme.css", "base.css"] as const;

/**
 * Copies the HTML and CSS **verbatim**.
 *
 * Bun's bundler rewrites `light-dark()` and flattens CSS Nesting, which is
 * precisely the modern CSS we want to ship untouched. So only TypeScript goes
 * through Bun.build; markup and styles are copied as-is.
 */
function copyStatic(outdir: string): void {
	const sharedOut = join(outdir, "shared");
	mkdirSync(sharedOut, { recursive: true });
	for (const file of SHARED_CSS) {
		cpSync(join(appDir, "shared", file), join(sharedOut, file));
	}

	for (const page of PAGES) {
		const pageOut = join(outdir, page);
		mkdirSync(pageOut, { recursive: true });
		cpSync(join(appDir, page, "index.html"), join(pageOut, "index.html"));
		cpSync(join(appDir, page, `${page}.css`), join(pageOut, `${page}.css`));
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
	const { minify = true, sourcemap = false } = options;
	const outdir = options.outdir ?? join(rawDir, "src", "ui");
	mkdirSync(outdir, { recursive: true });

	const result = await Bun.build({
		entrypoints: PAGES.map((page) => join(appDir, page, `${page}.ts`)),
		root: appDir,
		outdir,
		target: "browser",
		format: "esm",
		splitting: true,
		minify,
		sourcemap,
		naming: {
			entry: "[dir]/[name].js",
			chunk: "chunks/[name]-[hash].js",
			asset: "assets/[name]-[hash].[ext]",
		},
		define: {
			"process.env.NODE_ENV": '"production"',
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

	copyStatic(outdir);
	return result;
}

if (import.meta.main) {
	await buildUi({ sourcemap: true });
	console.log(`• Built UI into ${join(rawDir, "src", "ui")}`);
}
