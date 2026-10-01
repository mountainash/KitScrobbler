import { execFileSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { rawDir, upstreamDir, upstreamDriver, upstreamRawDir } from "./paths";

/**
 * Installs the submodule's own dependencies (it uses npm, so we run `npm ci`
 * against its `package-lock.json`).
 *
 * Skipped when already installed, so this is cheap to call from `bun install`'s
 * postinstall as well as from the build.
 */
export function ensureUpstreamDependencies(): void {
	const tsx = join(upstreamDir, "node_modules", ".bin", "tsx");
	if (existsSync(tsx)) {
		return;
	}

	console.log("• Installing upstream dependencies (npm ci)…");
	execFileSync("npm", ["ci", "--no-audit", "--no-fund"], {
		cwd: upstreamDir,
		stdio: "inherit",
	});
}

/**
 * Runs upstream's build in the submodule, producing `build/safariraw`, and copies
 * it out to our own `build/safariraw`.
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

	console.log("• Building upstream raw Safari bundle…");
	execFileSync(tsx, [upstreamDriver], {
		cwd: upstreamDir,
		stdio: "inherit",
	});

	if (!existsSync(upstreamRawDir)) {
		throw new Error("Upstream did not produce build/safariraw.");
	}

	rmSync(rawDir, { recursive: true, force: true });
	cpSync(upstreamRawDir, rawDir, { recursive: true });
	console.log(`• Copied raw bundle to ${rawDir}`);
}
