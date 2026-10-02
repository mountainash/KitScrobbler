/**
 * The two toolbar icons Kit Scrobbler ships, in place of upstream's generated
 * per-mode set (one file per controller mode, size and theme).
 */
export const ACTION_ICONS = {
	recording: "icons/kit-scrobbler-recording.svg",
	idle: "icons/kit-scrobbler-unsupported.svg",
} as const;

/** As much of a `browser.action.setIcon` call as we touch. */
export interface ActionIconDetails {
	path?: string | Record<string, string>;
	tabId?: number;
}

/** Upstream asks for `icons/action_<mode>_<size>_<theme>.png` on every update. */
const UPSTREAM_ICON = /(?:^|\/)action_([a-z]+)_\d+_/;

/**
 * Picks Kit's artwork for one of upstream's action icon paths.
 *
 * Only `Playing` means music is actually running, so every other mode —
 * upstream's `Paused`, `Scrobbled`, `Unsupported` and the rest — shows the
 * resting icon.
 */
export function kitActionIconPath(upstreamPath: string): string {
	const mode = UPSTREAM_ICON.exec(upstreamPath)?.[1];
	return mode === "playing" ? ACTION_ICONS.recording : ACTION_ICONS.idle;
}

/**
 * Rewrites an upstream `setIcon` call so it asks for Kit's artwork, keeping the
 * sizes it chose (Safari scales the SVG to whichever key it is given).
 */
export function withKitActionIcon(
	details: ActionIconDetails,
): ActionIconDetails {
	if (typeof details.path === "string") {
		return { ...details, path: kitActionIconPath(details.path) };
	}

	if (details.path) {
		return {
			...details,
			path: Object.fromEntries(
				Object.entries(details.path).map(([size, path]) => [
					size,
					kitActionIconPath(path),
				]),
			),
		};
	}

	// An `imageData` call supplies its own bitmap; there is nothing to swap.
	return details;
}
