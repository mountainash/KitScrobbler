import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
	buildDir,
	distDir,
	rawDir,
	upstreamAppDir,
	upstreamDir,
	upstreamRawDir,
} from "./paths";

function hasXcodebuild(): boolean {
	try {
		execFileSync("xcodebuild", ["-version"], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

/**
 * Wraps our UI-overlaid raw bundle into a native Safari app via Xcode.
 *
 * Upstream's Xcode project references `../../../build/safariraw` relative to
 * `.xcode/`, so the bundle has to be placed back inside the submodule before
 * running `safari.sh`. The built app is copied out to our own `build/`.
 */
export function buildXcodeApp(): string {
	if (process.platform !== "darwin") {
		throw new Error("Building the Safari app requires macOS + Xcode.");
	}
	if (!hasXcodebuild()) {
		throw new Error("xcodebuild was not found. Install Xcode, then retry.");
	}

	rmSync(upstreamRawDir, { recursive: true, force: true });
	cpSync(rawDir, upstreamRawDir, { recursive: true });

	console.log("• Compiling the Safari app with xcodebuild…");
	execFileSync("bash", ["safari.sh"], { cwd: upstreamDir, stdio: "inherit" });

	if (!existsSync(upstreamAppDir)) {
		throw new Error("Xcode did not produce build/safari.");
	}

	const out = join(buildDir, "safari");
	rmSync(out, { recursive: true, force: true });
	cpSync(upstreamAppDir, out, { recursive: true });

	const app = readdirSync(out).find((entry) => entry.endsWith(".app"));
	const appPath = app ? join(out, app) : out;
	console.log(`• Safari app: ${appPath}`);
	return appPath;
}

/** Packages the built app into a zip for distribution. */
export function packageApp(appPath: string): string {
	mkdirSync(distDir, { recursive: true });

	const zip = join(distDir, "KitScrobbler-safari.zip");
	rmSync(zip, { force: true });
	execFileSync("ditto", ["-c", "-k", "--keepParent", appPath, zip], {
		stdio: "inherit",
	});
	console.log(`• Packaged ${zip}`);
	return zip;
}
