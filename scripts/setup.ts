import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { cleanGitEnv } from "./git";
import { ensureUpstreamDependencies } from "./upstream";

/**
 * `postinstall` entry point: makes a fresh checkout ready to build and
 * type-check. It fetches the read-only Web Scrobbler submodule and then installs
 * the submodule's own dependencies.
 *
 * Idempotent and cheap: each step no-ops once it has already been done, so
 * subsequent `bun install` runs stay fast.
 */
const REL = "src/web-scrobbler";
const root = join(import.meta.dir, "..");
const submodule = join(root, REL);

function ensureSubmodule(): void {
	if (!existsSync(join(root, ".gitmodules"))) {
		console.log(`⏭  No ${REL} submodule declared — skipping.`);
		return;
	}

	if (!existsSync(join(root, ".git"))) {
		console.log(`⏭  Not a git checkout — skipping ${REL} initialisation.`);
		return;
	}

	if (existsSync(join(submodule, ".git"))) {
		console.log(`✔ ${REL} submodule already initialised.`);
		return;
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
}

ensureSubmodule();

if (existsSync(join(submodule, "package.json"))) {
	ensureUpstreamDependencies();
}
