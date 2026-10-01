import { execFileSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { rawDir, upstreamDir, upstreamDriver, upstreamRawDir } from "./paths";

/**
 * Runs upstream's build in the submodule, producing `build/safariraw`, and copies
 * it out to our own `build/safariraw`.
 *
 * We never write our own files into the submodule (the driver lives here and is
 * merely *executed* with the submodule as its working directory).
 */
export function buildUpstreamRaw(): void {
	const nodeModules = join(upstreamDir, "node_modules");
	if (!existsSync(nodeModules)) {
		console.log("• Installing upstream dependencies (npm ci)…");
		execFileSync("npm", ["ci", "--no-audit", "--no-fund"], {
			cwd: upstreamDir,
			stdio: "inherit",
		});
	}

	const tsx = join(nodeModules, ".bin", "tsx");
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
