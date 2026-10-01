import { execFileSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import { delimiter, join } from "node:path";
import {
	previewDir,
	upstreamDir,
	upstreamDriver,
	upstreamRawDir,
} from "./paths";

/**
 * Installs the submodule's own dependencies (it uses npm, so we run `npm ci`
 * against its `package-lock.json`).
 *
 * Skipped when already installed, so this is cheap to call from `bun install`'s
 * postinstall as well as from the build.
 */
export function ensureUpstreamDependencies(): void {
	// Upstream's build needs its devDependencies (the Vite plugins), and npm
	// omits them when NODE_ENV=production — so force `--include=dev` and use a
	// dev-only package as the "already installed" sentinel.
	const sentinel = join(upstreamDir, "node_modules", "vite-plugin-solid");
	if (existsSync(sentinel)) {
		return;
	}

	// Upstream's toolchain also has packages with install scripts (esbuild,
	// canvas, the jpegtran/pngquant binaries); npm 12 blocks those by default.
	console.log("• Installing upstream dependencies (npm ci --include=dev)…");
	execFileSync(
		"npm",
		[
			"ci",
			"--include=dev",
			"--dangerously-allow-all-scripts",
			"--no-audit",
			"--no-fund",
		],
		{ cwd: upstreamDir, stdio: "inherit" },
	);
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
			`Upstream's tsx is missing. Run "npm ci" in ${upstreamDir} and retry.`,
		);
	}

	// Upstream's connector step shells out to `esbuild`, which it finds on PATH
	// via npm. We invoke tsx directly, so add its bin directory ourselves.
	const binDir = join(upstreamDir, "node_modules", ".bin");
	const path = `${binDir}${delimiter}${process.env.PATH ?? ""}`;

	console.log("• Building upstream raw Safari bundle…");
	execFileSync(tsx, [upstreamDriver], {
		cwd: upstreamDir,
		stdio: "inherit",
		env: { ...process.env, PATH: path },
	});

	if (!existsSync(upstreamRawDir)) {
		throw new Error("Upstream did not produce build/safariraw.");
	}

	rmSync(previewDir, { recursive: true, force: true });
	cpSync(upstreamRawDir, previewDir, { recursive: true });
	console.log(`• Copied raw bundle to ${previewDir}`);
}
