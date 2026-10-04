/**
 * Kit Scrobbler's toolbar artwork: one SVG per controller mode, named for the
 * mode upstream asks for in `icons/action_<mode>_<size>_<theme>.png`.
 * `scripts/action-icons.ts` renders each one to those PNG names at build time,
 * because `action.setIcon` needs a bitmap.
 *
 * Playing has no file of its own: the recording mark is the artwork made for it.
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

/** The sizes Safari asks for. */
export const ACTION_ICON_SIZES = [16, 19, 32, 38] as const;

/**
 * The themes upstream can ask for in `action_<mode>_<size>_<theme>.png`. Kit's
 * artwork is the same whichever theme is requested, so each render is written
 * under all of these names.
 */
export const ACTION_ICON_THEMES = ["safari", "light", "dark"] as const;

/** The PNG name upstream expects, rendered by `scripts/action-icons.ts`. */
export function actionIconFile(
	mode: string,
	size: number,
	theme: string,
): string {
	return `action_${mode}_${size}_${theme}.png`;
}

/**
 * The staged path for a mode at one size and theme. A mode with no artwork of
 * its own gets the unsupported mark, whose file always exists.
 */
export function actionIconPath(
	mode: string | undefined,
	size: number,
	theme: string = ACTION_ICON_THEMES[0],
): string {
	const known = mode && mode in ACTION_ICONS ? mode : "unsupported";
	return `icons/${actionIconFile(known, size, theme)}`;
}

/** Upstream asks for `icons/action_<mode>_<size>_<theme>.png` on every update. */
const UPSTREAM_ICON = /(?:^|\/)action_([a-z]+)_(\d+)_([a-z]+)\.png$/;

/**
 * Rewrites one of upstream's action icon paths to Kit's rendered artwork for the
 * same mode, size and theme.
 */
export function kitActionIconPath(upstreamPath: string): string {
	const [, mode, size, theme] = UPSTREAM_ICON.exec(upstreamPath) ?? [];
	return actionIconPath(mode, Number(size ?? ACTION_ICON_SIZES[0]), theme);
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
