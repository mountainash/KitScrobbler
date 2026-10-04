import { cpSync, existsSync, rmSync } from "node:fs";
import { delimiter, join } from "node:path";
import {
	previewDir,
	upstreamDir,
	upstreamDriver,
	upstreamRawDir,
} from "./paths";

/**
 * Installs the submodule's own dependencies
 *
 * Skipped when already installed, so this is cheap to call from `bun install`'s
 * postinstall as well as from the build.
 */
export function ensureUpstreamDependencies(): void {
	// Upstream's build needs its devDependencies (the Vite plugins)
	const sentinel = join(upstreamDir, "node_modules", "vite-plugin-solid");
	if (existsSync(sentinel)) {
		return;
	}

	console.log("• Installing upstream dependencies");

	// Upstream's toolchain also has packages with install scripts (esbuild, canvas, the jpegtran/pngquant binaries)
	Bun.spawnSync(["bun", "i", "--no-save"], {
		cwd: upstreamDir,
		timeout: 15000, // 15 seconds in milliseconds
	});
}

/**
 * Runs upstream's build in the submodule, producing `build/safariraw`, and copies
 * it out to our preview extension.
 *
 * We never write our own files into the submodule (the driver lives here and is
 * merely *executed* with the submodule as its working directory).
 */
export function buildUpstreamRaw(): void {
	ensureUpstreamDependencies();

	const tsx = join(upstreamDir, "node_modules", ".bin", "tsx");

	if (!existsSync(tsx)) {
		throw new Error(
			`⚠️ Upstream's tsx is missing. Run "bun i" in ${upstreamDir} and retry.`,
		);
	}

	// Upstream's connector step shells out to `esbuild`. Invoke tsx directly
	const binDir = join(upstreamDir, "node_modules", ".bin");
	const path = `${binDir}${delimiter}${process.env.PATH ?? ""}`;

	console.log("• Building upstream raw Safari bundle…");

	Bun.spawnSync(["tsx", upstreamDriver], {
		cwd: upstreamDir,
		stdio: ["inherit", "inherit", "inherit"],
		env: { ...process.env, PATH: path },
		timeout: 15000, // 15 seconds in milliseconds
	});

	if (!existsSync(upstreamRawDir)) {
		throw new Error("💣 Upstream did not produce build/safariraw.");
	}

	rmSync(previewDir, { recursive: true, force: true });
	cpSync(upstreamRawDir, previewDir, { recursive: true });
	console.log(`• Copied raw bundle to ${previewDir}`);
}
