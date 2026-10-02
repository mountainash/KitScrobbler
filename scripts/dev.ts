import { join } from "node:path";
import optionsHtml from "../app/options/index.html";
import devHtml from "../app/popup/dev.html";
import popupHtml from "../app/popup/index.html";
import { appDir } from "./paths";
import { ensurePhosphorAssets } from "./phosphor";

/**
 * Dev server built on Bun's own development server.
 *
 * Run it with `bun --hot scripts/dev.ts`: Bun bundles the pages on demand
 * straight from `app/` and pushes HMR updates to the browser, so there is no
 * hand-rolled reload client here.
 *
 * Note that because Bun bundles these pages it also processes our CSS (see the
 * dev caveat in AGENTS.md).
 */
const port = Number(process.env.PORT ?? 3000);

// Bun resolves each page's `<link href>` against the page, so the Phosphor
// stylesheet and font have to live in `app/vendor/phosphor/`.
ensurePhosphorAssets();

const server = Bun.serve({
	port,
	development: { hmr: true, console: true },
	routes: {
		"/": devHtml,
		"/popup/index.html": popupHtml,
		"/popup/dev.html": devHtml,
		"/options/index.html": optionsHtml,
		// The pages link to extension-relative assets by their built paths.
		"/src/ui/options/index.html": optionsHtml,
		"/icons/kit-scrobbler.svg": Bun.file(
			join(appDir, "icons", "kit-scrobbler.svg"),
		),
	},
});

console.log(
	`\nKit Scrobbler dev → http://localhost:${server.port}/popup/dev.html\n`,
);
