import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import {
	archivePath,
	distDir,
	exportOptionsPath,
	previewDir,
	upstreamDir,
	upstreamRawDir,
} from "./paths";

const WORKSPACE =
	".xcode/Web Scrobbler/Web Scrobbler.xcodeproj/project.xcworkspace";
const SCHEME = "Web Scrobbler (macOS)";

function requireMacOS(): void {
	if (process.platform !== "darwin") {
		throw new Error(
			"Bundling for the App Store needs macOS + Xcode. `bun run build` works everywhere.",
		);
	}
}

function requireXcode(): void {
	try {
		execFileSync("xcodebuild", ["-version"], { stdio: "ignore" });
	} catch {
		throw new Error("xcodebuild was not found. Install Xcode and retry.");
	}
}

/** Fails fast when the machine cannot produce an App Store build. */
export function assertCanBundle(): void {
	requireMacOS();
	requireXcode();
}

/**
 * Places the preview extension where upstream's Xcode project expects it.
 *
 * The pbxproj references `../../../build/safariraw` relative to `.xcode/`, so the
 * bundle has to sit inside the submodule (in its gitignored `build/`).
 */
export function stagePreviewForXcode(): void {
	rmSync(upstreamRawDir, { recursive: true, force: true });
	cpSync(previewDir, upstreamRawDir, { recursive: true });
	console.log(`• Staged preview bundle for Xcode (${upstreamRawDir})`);
}

/** Archives the host app + extension with `xcodebuild archive`. */
export function createArchive(): string {
	requireMacOS();
	requireXcode();

	rmSync(archivePath, { recursive: true, force: true });

	const team = process.env.DEVELOPMENT_TEAM;
	const args = [
		"archive",
		"-workspace",
		WORKSPACE,
		"-scheme",
		SCHEME,
		"-configuration",
		"Release",
		"-destination",
		"generic/platform=macOS",
		"-archivePath",
		archivePath,
		"-allowProvisioningUpdates",
		"CODE_SIGN_STYLE=Automatic",
	];
	if (team) {
		args.push(`DEVELOPMENT_TEAM=${team}`);
	}

	console.log("• Archiving with xcodebuild (Release)…");
	execFileSync("xcodebuild", args, { cwd: upstreamDir, stdio: "inherit" });

	if (!existsSync(archivePath)) {
		throw new Error("xcodebuild did not produce an archive.");
	}
	return archivePath;
}

/**
 * Exports the archive for the App Store.
 *
 * Set `EXPORT_DESTINATION=upload` to send it straight to App Store Connect
 * (needs credentials in the keychain); the default `export` writes a `.pkg`
 * into `dist/` for manual upload with Transporter.
 */
export function exportForAppStore(archive: string): string {
	requireXcode();

	const method = process.env.EXPORT_METHOD ?? "app-store-connect";
	const destination = process.env.EXPORT_DESTINATION ?? "export";

	writeFileSync(
		exportOptionsPath,
		exportOptionsPlist({
			method,
			destination,
			team: process.env.DEVELOPMENT_TEAM,
		}),
	);

	mkdirSync(distDir, { recursive: true });

	console.log(`• Exporting for the App Store (${method}, ${destination})…`);
	execFileSync(
		"xcodebuild",
		[
			"-exportArchive",
			"-archivePath",
			archive,
			"-exportOptionsPlist",
			exportOptionsPath,
			"-exportPath",
			distDir,
			"-allowProvisioningUpdates",
		],
		{ cwd: upstreamDir, stdio: "inherit" },
	);

	return distDir;
}

function exportOptionsPlist(options: {
	method: string;
	destination: string;
	team?: string;
}): string {
	const entries = [
		"\t<key>method</key>",
		`\t<string>${options.method}</string>`,
		"\t<key>destination</key>",
		`\t<string>${options.destination}</string>`,
		"\t<key>signingStyle</key>",
		"\t<string>automatic</string>",
	];
	if (options.team) {
		entries.push("\t<key>teamID</key>", `\t<string>${options.team}</string>`);
	}

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
		'<plist version="1.0">',
		"<dict>",
		...entries,
		"</dict>",
		"</plist>",
		"",
	].join("\n");
}
