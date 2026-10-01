import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const REL = "src/web-scrobbler";
const root = join(import.meta.dir, "..");
const submodule = join(root, REL);

/**
 * Git exports `GIT_DIR`/`GIT_INDEX_FILE`/… for hooks. With a relative `GIT_DIR`
 * and our cwd inside the submodule, those would resolve against the submodule
 * (whose `.git` is a gitlink *file*), so strip them before running git.
 */
const GIT_ENV_VARS = [
	"GIT_DIR",
	"GIT_WORK_TREE",
	"GIT_INDEX_FILE",
	"GIT_OBJECT_DIRECTORY",
	"GIT_COMMON_DIR",
	"GIT_PREFIX",
	"GIT_ALTERNATE_OBJECT_DIRECTORIES",
];

function cleanGitEnv(): Record<string, string | undefined> {
	const env: Record<string, string | undefined> = { ...process.env };
	for (const key of GIT_ENV_VARS) {
		delete env[key];
	}
	return env;
}

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
