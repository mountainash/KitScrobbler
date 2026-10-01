/**
 * Git exports `GIT_DIR`/`GIT_INDEX_FILE`/… for hooks. With a relative `GIT_DIR`
 * and a cwd inside a submodule (whose `.git` is a gitlink *file*), those vars
 * resolve against the wrong place — so we strip them before shelling out.
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

/** A copy of the environment with git's hook variables removed. */
export function cleanGitEnv(): Record<string, string | undefined> {
	const env: Record<string, string | undefined> = { ...process.env };
	for (const key of GIT_ENV_VARS) {
		delete env[key];
	}
	return env;
}
