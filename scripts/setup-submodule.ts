import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { cleanGitEnv } from "./git";

/**
 * Initialises the read-only Web Scrobbler submodule.
 *
 * Wired to `postinstall`, so a fresh checkout only needs `bun install` before
 * `bun run build` will work. Idempotent and cheap: it no-ops once the submodule
 * is present, so subsequent installs stay fast.
 */
const REL = "src/web-scrobbler";
const root = join(import.meta.dir, "..");
const submodule = join(root, REL);

if (!existsSync(join(root, ".gitmodules"))) {
	console.log(`⏭  No ${REL} submodule declared — nothing to initialise.`);
	process.exit(0);
}

if (!existsSync(join(root, ".git"))) {
	console.log(
		`⏭  Not a git checkout — skipping ${REL} submodule initialisation.`,
	);
	process.exit(0);
}

if (existsSync(join(submodule, ".git"))) {
	console.log(`✔ ${REL} submodule already initialised.`);
	process.exit(0);
}

console.log(`• Initialising the ${REL} submodule…`);
try {
	execFileSync("git", ["submodule", "update", "--init", "--recursive"], {
		cwd: root,
		env: cleanGitEnv(),
		stdio: "inherit",
	});
} catch {
	console.error(
		[
			"",
			`✖ Could not initialise the ${REL} submodule.`,
			"",
			"  Kit Scrobbler vendors Web Scrobbler as a git submodule. Fetch it with:",
			"",
			"    git submodule update --init --recursive",
			"",
		].join("\n"),
	);
	process.exit(1);
}

console.log(`✔ ${REL} submodule ready.`);
