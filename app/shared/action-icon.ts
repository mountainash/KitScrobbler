/**
 * Kit Scrobbler's toolbar artwork, one file per controller mode, named for the
 * mode upstream asks for in `icons/action_<mode>_<size>_<theme>.png`.
 *
 * Playing has no file of its own: it keeps the recording mark.
 */
export const ACTION_ICONS: Record<string, string> = {
	base: "action_base.svg",
	disabled: "action_disabled.svg",
	disallowed: "action_disallowed.svg",
	error: "action_error.svg",
	ignored: "action_ignored.svg",
	loading: "action_loading.svg",
	loved: "action_loved.svg",
	paused: "action_paused.svg",
	playing: "kit-scrobbler-recording.svg",
	scrobbled: "action_scrobbled.svg",
	skipped: "action_skipped.svg",
	unknown: "action_unknown.svg",
	unloved: "action_unloved.svg",
	unsupported: "action_unsupported.svg",
};

/** As much of a `browser.action.setIcon` call as we touch. */
export interface ActionIconDetails {
	path?: string | Record<string, string>;
	tabId?: number;
}

/** Upstream asks for `icons/action_<mode>_<size>_<theme>.png` on every update. */
const UPSTREAM_ICON = /(?:^|\/)action_([a-z]+)_\d+_/;

/** The staged path for a controller mode, defaulting to the unsupported mark. */
export function actionIconPath(mode: string | undefined): string {
	return `icons/${(mode && ACTION_ICONS[mode]) || ACTION_ICONS.unsupported}`;
}

/**
 * Picks Kit's artwork for one of upstream's action icon paths — the mode
 * upstream already decided on, drawn as one of our own SVGs.
 */
export function kitActionIconPath(upstreamPath: string): string {
	return actionIconPath(UPSTREAM_ICON.exec(upstreamPath)?.[1]);
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
