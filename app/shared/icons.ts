/**
 * Icons come from [Phosphor](https://phosphoricons.com) via
 * `@phosphor-icons/web`.
 *
 * Why not bespoke SVG paths (upstream's approach): Phosphor is a consistent,
 * macOS-friendly set with far more glyphs, and it ships as a webfont — so there
 * is no icon build or minification step, which upstream's pipeline needs native
 * canvas and image tooling to run.
 *
 * The font files and CSS are copied into the built extension by
 * `scripts/build-ui.ts`; the dev server streams them from `app/vendor/phosphor`.
 */

/** Phosphor glyph name, without the `ph-` prefix. */
export type IconName = string;

/**
 * Phosphor ships each weight as its own font: `regular` is the outline set, and
 * `fill` draws the same glyphs solid.
 */
export type IconWeight = "regular" | "fill";

/** Semantic names for the icons Kit Scrobbler uses. */
export const ICONS = {
	settings: "gear-six",
	appearance: "paint-brush",
	accounts: "user-circle",
	connectors: "puzzle-piece",
	youtube: "youtube-logo",
	about: "info",
	search: "magnifying-glass",
	heart: "heart",
	link: "link",
	skip: "prohibit-inset",
	edit: "pencil-simple",
	note: "music-notes",
	scrobbles: "lastfm-logo",
	unsupported: "cloud-slash",
	disabled: "waveform-slash",
	check: "check",
	track: "music-note",
	artist: "user",
	album: "vinyl-record",
	albumArtist: "users",
} as const;

/** A Phosphor glyph per scrobbling service. */
export const SERVICE_ICONS: Record<string, IconName> = {
	"Last.fm": "lastfm-logo",
	"Libre.fm": "heart-half",
	ListenBrainz: "brain",
	Maloja: "chart-donut",
	Webhook: "webhooks-logo",
	Pleroma: "planet",
};

/**
 * A Phosphor glyph per connector, keyed by upstream's connector id.
 *
 * Phosphor carries a lot of brand logos but not every service, and several
 * connectors are variants of one (Bandcamp's daily and embed pages), so ids that
 * share a service share a glyph.
 */
export const CONNECTOR_ICONS: Record<string, IconName> = {
	youtube: "youtube-logo",
	"youtube-music": "youtube-logo",
	soundcloud: "soundcloud-logo",
	spotify: "spotify-logo",
	tidal: "tidal-logo",
	amazon: "amazon-logo",
	"amazon-alexa": "amazon-logo",
	"apple-music": "apple-logo",
	// Phosphor has no Bandcamp logo, so the project's stand-in is a shape.
	bandcamp: "parallelogram",
	"bandcamp-daily": "parallelogram",
	"bandcamp-embed": "parallelogram",
};

/** The glyph for a connector, falling back to the generic music note. */
export function connectorIcon(id: string | undefined): IconName {
	return (id ? CONNECTOR_ICONS[id] : undefined) ?? ICONS.note;
}

/**
 * Builds a Phosphor icon. The glyph is sized by `font-size`, and inherits the
 * surrounding `color`.
 */
export function icon(
	name: IconName,
	size = 16,
	weight: IconWeight = "regular",
): HTMLElement {
	const node = document.createElement("i");
	node.className = `${weight === "fill" ? "ph-fill" : "ph"} ph-${name}`;
	node.setAttribute("aria-hidden", "true");
	node.style.fontSize = `${size}px`;
	return node;
}
