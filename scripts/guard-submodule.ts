import { existsSync } from "node:fs";
import { join } from "node:path";
import type { SyncSubprocess } from "bun";
import { cleanGitEnv } from "./git";

const REL = "src/web-scrobbler";
const root = join(import.meta.dir, "..");
const submodule = join(root, REL);

if (!existsSync(join(submodule, ".git"))) {
	console.log(`⏭  No submodule at ${REL} — nothing to guard.`);
	process.exit(0);
}

let status: SyncSubprocess;

try {
	status = Bun.spawnSync(["git", "status", "--porcelain"], {
		cwd: submodule,
		env: cleanGitEnv(),
	});
	console.log(`ℹ️ Status of upstream submodule (${REL}):\n${status.stdout}`);
} catch (err) {
	console.error(`❌ Could not read status of ${REL}.`);
	console.error(err);
	process.exit(1);
}

const changes = await status.stdout?.toString().trim();

if (changes) {
	const indented = changes
		.split("\n")
		.map((line) => `    ${line}`)
		.join("\n");
	console.error(
		[
			"",
			`❌ Kit Scrobbler forbids modifying the upstream submodule (${REL}).`,
			"",
			"  The following changes were found inside it:",
			indented,
			"",
			"  Revert them before committing:",
			`    git -C ${REL} checkout -- . && git -C ${REL} clean -fd`,
			"",
		].join("\n"),
	);
	process.exit(1);
}

console.log(`✅ Upstream submodule (${REL}) is clean.`);
