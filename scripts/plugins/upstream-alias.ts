import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import type { BunPlugin } from "bun";
import { appDir, upstreamDir, upstreamSrcDir } from "../paths";

/**
 * Extensionless resolution, mirroring `moduleResolution: bundler`.
 *
 * Bun does this for relative imports, but a path returned from `onResolve` is
 * taken literally — so we resolve candidate extensions ourselves.
 */
function resolveFile(base: string): string | null {
	if (existsSync(base) && statSync(base).isFile()) {
		return base;
	}

	for (const ext of [
		".ts",
		".tsx",
		".mts",
		".cts",
		".js",
		".mjs",
		".cjs",
		".jsx",
	]) {
		const candidate = base + ext;
		if (existsSync(candidate) && statSync(candidate).isFile()) {
			return candidate;
		}
	}

	for (const index of ["index.ts", "index.tsx", "index.js"]) {
		const candidate = join(base, index);
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	return null;
}

/**
 * Resolves Kit Scrobbler's import aliases for Bun.build:
 *
 * - `@kit/*` → `app/*` (our code)
 * - `@upstream/*` → `src/web-scrobbler/*` (the submodule)
 * - `@/*` → `src/web-scrobbler/src/*` **only for files inside the submodule**
 *   (that is upstream's own internal alias; it is never ours)
 */
export function upstreamAlias(): BunPlugin {
	return {
		name: "kit-upstream-alias",
		setup(build) {
			build.onResolve({ filter: /^@upstream\// }, (args) => {
				const resolved = resolveFile(
					join(upstreamDir, args.path.slice("@upstream/".length)),
				);
				return resolved ? { path: resolved } : undefined;
			});

			build.onResolve({ filter: /^@kit\// }, (args) => {
				const resolved = resolveFile(
					join(appDir, args.path.slice("@kit/".length)),
				);
				return resolved ? { path: resolved } : undefined;
			});

			build.onResolve({ filter: /^@\// }, (args) => {
				if (!args.importer.startsWith(upstreamDir)) {
					return undefined;
				}
				const resolved = resolveFile(
					join(upstreamSrcDir, args.path.slice("@/".length)),
				);
				return resolved ? { path: resolved } : undefined;
			});
		},
	};
}
