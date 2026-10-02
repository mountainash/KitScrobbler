import { version } from "../../package.json";

/**
 * The Kit Scrobbler version, read straight from this project's `package.json` at
 * build time — the same value `scripts/manifest.ts` writes into the extension
 * manifest, so the About screen can never disagree with the build.
 */
export const VERSION: string = version;
