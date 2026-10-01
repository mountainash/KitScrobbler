import { watch } from "node:fs";
import { join } from "node:path";
import { buildUi } from "./build-ui";
import { appDir, buildDir } from "./paths";

/**
 * Live UI preview. Bun.build has no watch mode, so we rebuild on filesystem
 * changes and nudge the browser over Server-Sent Events.
 *
 * Outside an extension context the pages fall back to mock data, which makes
 * this useful for iterating on the Apple design system inside the Linux
 * devcontainer.
 */
const outdir = join(buildDir, "preview");
const port = Number(process.env.PORT ?? 3000);

const RELOAD_CLIENT = `<script>new EventSource('/__reload').onmessage=()=>location.reload();</script>`;

function injectReload(html: string): string {
	return html.includes("</body>")
		? html.replace("</body>", `${RELOAD_CLIENT}</body>`)
		: html + RELOAD_CLIENT;
}

let version = 0;
const listeners = new Set<() => void>();

await buildUi({ outdir, minify: false, sourcemap: true });

const server = Bun.serve({
	port,
	async fetch(request) {
		const url = new URL(request.url);

		if (url.pathname === "/__reload") {
			const stream = new ReadableStream({
				start(controller) {
					const send = () => {
						controller.enqueue(`data: ${version}\n\n`);
					};
					send();
					const listener = () => send();
					listeners.add(listener);
					request.signal.addEventListener("abort", () => {
						listeners.delete(listener);
					});
				},
			});
			return new Response(stream, {
				headers: {
					"Cache-Control": "no-cache",
					"Content-Type": "text/event-stream",
				},
			});
		}

		const pathname = url.pathname === "/" ? "/popup/index.html" : url.pathname;
		const file = Bun.file(join(outdir, pathname));

		if (!(await file.exists())) {
			return new Response("Not found", { status: 404 });
		}

		if (pathname.endsWith(".html")) {
			return new Response(injectReload(await file.text()), {
				headers: { "Content-Type": "text/html; charset=utf-8" },
			});
		}

		return new Response(file);
	},
});

let timer: ReturnType<typeof setTimeout> | undefined;

watch(appDir, { recursive: true }, () => {
	if (timer) {
		clearTimeout(timer);
	}
	timer = setTimeout(async () => {
		try {
			await buildUi({ outdir, minify: false, sourcemap: true });
			version += 1;
			for (const listener of listeners) {
				listener();
			}
			console.log(`• Rebuilt UI (v${version})`);
		} catch (error) {
			console.error("✖ UI rebuild failed:");
			console.error(error);
		}
	}, 100);
});

console.log(`\nKit Scrobbler UI preview → http://localhost:${server.port}\n`);
