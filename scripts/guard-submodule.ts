import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { cleanGitEnv } from "./git";

const REL = "src/web-scrobbler";
const root = join(import.meta.dir, "..");
const submodule = join(root, REL);

if (!existsSync(join(submodule, ".git"))) {
	console.log(`⏭  No submodule at ${REL} — nothing to guard.`);
	process.exit(0);
}

let status: string;
try {
	status = execFileSync("git", ["status", "--porcelain"], {
		cwd: submodule,
		encoding: "utf8",
		env: cleanGitEnv(),
	});
} catch (err) {
	console.error(`✖ Could not read status of ${REL}.`);
	console.error(err);
	process.exit(1);
}

const changes = status.trim();

if (changes) {
	const indented = changes
		.split("\n")
		.map((line) => `    ${line}`)
		.join("\n");
	console.error(
		[
			"",
			`✖ Kit Scrobbler forbids modifying the upstream submodule (${REL}).`,
			"",
			"  The following changes were found inside it:",
			"",
			indented,
			"",
			"  Revert them before committing:",
			`    git -C ${REL} checkout -- . && git -C ${REL} clean -fd`,
			"",
		].join("\n"),
	);
	process.exit(1);
}

console.log(`✔ Upstream submodule (${REL}) is clean.`);
