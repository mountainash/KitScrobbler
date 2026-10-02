import { connectorMatches } from "@kit/shared/connector-matches";
import { el, mount, segmentedControl, switchControl } from "@kit/shared/dom";
import { ICONS, icon } from "@kit/shared/icons";
import {
	type OverrideKey,
	type UpstreamOptions,
	upstreamOptions,
} from "@kit/shared/upstream";
import type { ConnectorMeta } from "@upstream/src/core/connectors";
import connectors from "@upstream/src/core/connectors";
import type { ConnectorsOverrideOptionValues } from "@upstream/src/core/storage/options";

/**
 * Upstream sorts its connector list by label (`getSortedConnectors`). We sort the
 * same way here rather than importing that helper, which pulls in the storage
 * layer — and with it `webextension-polyfill` — just for a comparator.
 */
const ALL_CONNECTORS: ConnectorMeta[] = [...connectors].sort((a, b) =>
	a.label.localeCompare(b.label),
);

/**
 * Services worth surfacing above the alphabetical list. The order is deliberate:
 * video first, then the audio services.
 */
const POPULAR_IDS = [
	"spotify",
	"youtube",
	"youtube-music",
	"soundcloud",
	"bandcamp",
	"tidal",
	"mixcloud",
] as const;

const POPULAR_SET = new Set<string>(POPULAR_IDS);

const POPULAR_CONNECTORS = POPULAR_IDS.map((id) =>
	ALL_CONNECTORS.find((connector) => connector.id === id),
).filter((connector): connector is ConnectorMeta => connector !== undefined);

const OTHER_CONNECTORS = ALL_CONNECTORS.filter(
	(connector) => !POPULAR_SET.has(connector.id),
);

/**
 * Which connectors the narrowed manifest can actually run. `connectorMatches` is
 * the same function the build uses to write `content_scripts.matches`, so the
 * options page and the manifest can never disagree.
 */
const MATCH_REPORT = connectorMatches();
const UNREACHABLE = new Set(MATCH_REPORT.unreachableConnectors);
const PARTIAL = new Set(MATCH_REPORT.partialConnectors);
const AVAILABLE_CONNECTORS = ALL_CONNECTORS.filter(
	(c) => !UNREACHABLE.has(c.id),
);

const ISSUES_URL = "https://github.com/mountainash/KitScrobbler/issues";

/**
 * Upstream's override storage keys, mirroring the constants it exports from
 * `core/storage/options`. They are typed as `OverrideKey`, so if upstream renames
 * one our typecheck fails instead of silently writing somewhere else.
 */
const KEYS = {
	notifications: "useNotifications",
	unrecognizedNotifications: "useUnrecognizedSongNotifications",
	infobox: "showInfobox",
	podcasts: "scrobblePodcasts",
	autoToggleLove: "autoToggleLove",
	forceRecognize: "forceRecognize",
	scrobbleRecognizedTracks: "scrobbleRecognizedTracks",
	scrobbleEditedTracksOnly: "scrobbleEditedTracksOnly",
} satisfies Record<string, OverrideKey>;

const TOGGLES: { key: OverrideKey; label: string; hint: string }[] = [
	{
		key: KEYS.notifications,
		label: "Notifications",
		hint: "Show a notification when a track starts",
	},
	{
		key: KEYS.unrecognizedNotifications,
		label: "Unrecognised track notifications",
		hint: "Notify when a track could not be identified",
	},
	{
		key: KEYS.infobox,
		label: "In-page infobox",
		hint: "Show the status box on the page",
	},
	{
		key: KEYS.podcasts,
		label: "Scrobble podcasts",
		hint: "Include podcast episodes",
	},
	{
		key: KEYS.autoToggleLove,
		label: "Auto love",
		hint: "Love tracks when the site does",
	},
];

/** Matches upstream's radio group, plus the implicit "inherit" case. */
const BEHAVIOURS: { value: string; label: string }[] = [
	{ value: "default", label: "Use the global setting" },
	{ value: "force", label: "Force recognition" },
	{ value: "recognized", label: "Only recognised tracks" },
	{ value: "edited", label: "Only edited tracks" },
];

function select(
	label: string,
	choices: { value: string; label: string }[],
	current: string,
	onChange: (value: string) => void,
): HTMLSelectElement {
	const node = el("select", { "aria-label": label });
	for (const choice of choices) {
		node.append(el("option", { value: choice.value }, choice.label));
	}
	node.value = current;
	node.addEventListener("change", () => onChange(node.value));
	return node;
}

type OverrideChoice = "default" | "on" | "off";

/** Tri-state override: "Default" inherits the global setting. */
const OVERRIDE_CHOICES: { value: OverrideChoice; label: string }[] = [
	{ value: "default", label: "Default" },
	{ value: "on", label: "On" },
	{ value: "off", label: "Off" },
];

function overrideControl(
	label: string,
	value: boolean | undefined,
	onChange: (value: boolean | undefined) => void,
): HTMLElement {
	return segmentedControl(
		OVERRIDE_CHOICES,
		value === undefined ? "default" : value ? "on" : "off",
		(next) => onChange(next === "default" ? undefined : next === "on"),
		label,
	);
}

/**
 * The Connectors page: enable/disable and per-connector overrides — all read and
 * written through upstream's own helpers, so the background and content scripts
 * honour them unchanged.
 *
 * Custom URL patterns are deliberately not offered: the manifest only matches the
 * sites the connectors declare, so a user-added pattern could never inject the
 * content script.
 */
export function connectorsSection(): HTMLElement {
	let disabled: Record<string, boolean> = {};
	let overrides: Record<string, ConnectorsOverrideOptionValues> = {};
	let query = "";
	let options: UpstreamOptions | null = null;

	const masterList = el("ul", { class: "list" });
	const groups = el("div", {});

	const search = el("input", {
		class: "text-field",
		type: "search",
		placeholder: "Filter connectors",
		"aria-label": "Filter connectors",
	});
	search.addEventListener("input", () => {
		query = search.value;
		render();
	});

	const section = el(
		"section",
		{},
		el("h2", { class: "content__heading" }, "Connectors"),
		el(
			"p",
			{ class: "content__subtitle" },
			"Turn music services on or off, and override scrobbling behaviour per site.",
		),
		masterList,
		el(
			"div",
			{ class: "connectors__toolbar" },
			el("span", { class: "connectors__search-icon" }, icon(ICONS.search, 16)),
			search,
		),
		groups,
	);

	/** Unavailable connectors are excluded: they can never run. */
	function enabledCount(): number {
		return AVAILABLE_CONNECTORS.filter((c) => !disabled[c.id]).length;
	}

	function matches(connector: ConnectorMeta): boolean {
		const needle = query.trim().toLowerCase();
		if (!needle) {
			return true;
		}
		return (
			connector.label.toLowerCase().includes(needle) ||
			connector.id.toLowerCase().includes(needle)
		);
	}

	function refreshMaster(): void {
		mount(masterList, masterRow());
	}

	async function persist(
		apply: (store: UpstreamOptions) => Promise<void>,
	): Promise<void> {
		if (options) {
			await apply(options);
		}
	}

	function toggle(connector: ConnectorMeta, enabled: boolean): void {
		if (enabled) {
			delete disabled[connector.id];
		} else {
			disabled[connector.id] = true;
		}
		// Only the master row changes, so an expanded connector stays open.
		refreshMaster();
		void persist((store) => store.setConnectorEnabled(connector, enabled));
	}

	function toggleAll(enabled: boolean): void {
		disabled = enabled
			? {}
			: Object.fromEntries(ALL_CONNECTORS.map((c) => [c.id, true]));
		render();
		void persist((store) => store.setAllConnectorsEnabled(enabled));
	}

	function setOverride(
		connector: ConnectorMeta,
		key: OverrideKey,
		value: boolean | undefined,
	): void {
		const current = { ...(overrides[connector.id] ?? {}) };
		if (value === undefined) {
			delete current[key];
		} else {
			current[key] = value;
		}
		overrides = { ...overrides, [connector.id]: current };
		void persist((store) => store.setOverride(connector.id, key, value));
	}

	function behaviour(override: ConnectorsOverrideOptionValues): string {
		if (override[KEYS.forceRecognize]) {
			return "force";
		}
		if (override[KEYS.scrobbleEditedTracksOnly]) {
			return "edited";
		}
		if (override[KEYS.scrobbleRecognizedTracks]) {
			return "recognized";
		}
		return "default";
	}

	function setBehaviour(connector: ConnectorMeta, value: string): void {
		const pick = (name: string) =>
			value === "default" ? undefined : value === name;
		setOverride(connector, KEYS.forceRecognize, pick("force"));
		setOverride(connector, KEYS.scrobbleRecognizedTracks, pick("recognized"));
		setOverride(connector, KEYS.scrobbleEditedTracksOnly, pick("edited"));
	}

	function row(name: string, hint: string, control: HTMLElement): HTMLElement {
		return el(
			"div",
			{ class: "connector__row" },
			el(
				"div",
				{ class: "connector__row-label" },
				el("div", { class: "connector__row-name" }, name),
				el("div", { class: "connector__row-hint" }, hint),
			),
			control,
		);
	}

	function details(connector: ConnectorMeta): HTMLElement {
		const override = overrides[connector.id] ?? {};
		return el(
			"div",
			{ class: "connector__body" },
			PARTIAL.has(connector.id)
				? el(
						"p",
						{ class: "connector__note" },
						"Some of this connector's site patterns couldn't be expressed, so it may not work everywhere.",
					)
				: null,
			el("h3", { class: "connector__group-title" }, "General"),
			...TOGGLES.map((toggle) =>
				row(
					toggle.label,
					toggle.hint,
					overrideControl(toggle.label, override[toggle.key], (value) =>
						setOverride(connector, toggle.key, value),
					),
				),
			),
			el("h3", { class: "connector__group-title" }, "Scrobble behaviour"),
			row(
				"Scrobble",
				"Which tracks from this site are scrobbled",
				select("Scrobble behaviour", BEHAVIOURS, behaviour(override), (value) =>
					setBehaviour(connector, value),
				),
			),
		);
	}

	/**
	 * A connector whose patterns cannot be expressed as match patterns. It can
	 * never run, so its switch and settings are disabled.
	 */
	function unavailableItem(connector: ConnectorMeta): HTMLElement {
		return el(
			"li",
			{ class: "connector-item" },
			el(
				"div",
				{ class: "list-row connector__summary is-unavailable" },
				el(
					"div",
					{ class: "list-row__label" },
					el("div", { class: "list-row__title" }, connector.label),
					el("div", { class: "list-row__subtitle" }, connector.id),
					el(
						"div",
						{ class: "connector__warning" },
						icon("warning-circle", 14),
						el(
							"span",
							{},
							"Not available: its site patterns can't be expressed as Safari matches. ",
						),
						el(
							"a",
							{ href: ISSUES_URL, target: "_blank", rel: "noreferrer" },
							"Raise an issue",
						),
						el("span", {}, " if you need it."),
					),
				),
				switchControl(connector.label, false, () => {}, true),
			),
		);
	}

	function connectorItem(connector: ConnectorMeta): HTMLElement {
		if (UNREACHABLE.has(connector.id)) {
			return unavailableItem(connector);
		}

		// Deliberately not a <details>/<summary>: Safari swallows clicks on a
		// native switch inside a summary, which stopped the row toggling. A button
		// for the disclosure keeps the switch a plain, working control.
		const body = el("div", { class: "connector__body", hidden: true });
		let built = false;

		const disclosure = el(
			"button",
			{
				class: "connector__disclosure",
				type: "button",
				"aria-expanded": "false",
				onClick: () => {
					const opening = body.hidden;
					body.hidden = !opening;
					disclosure.setAttribute("aria-expanded", String(opening));
					// Built on first expand, like upstream.
					if (opening && !built) {
						built = true;
						body.append(details(connector));
					}
				},
			},
			el("span", { class: "connector__chevron" }, icon("caret-right", 16)),
			el(
				"div",
				{ class: "list-row__label" },
				el("div", { class: "list-row__title" }, connector.label),
				el("div", { class: "list-row__subtitle" }, connector.id),
			),
		);

		return el(
			"li",
			{ class: "connector-item" },
			el(
				"div",
				{ class: "list-row connector__summary" },
				disclosure,
				switchControl(connector.label, !disabled[connector.id], (checked) =>
					toggle(connector, checked),
				),
			),
			body,
		);
	}

	function masterRow(): HTMLElement {
		const total = AVAILABLE_CONNECTORS.length;
		const enabled = enabledCount();
		return el(
			"li",
			{ class: "list-row" },
			el("span", { class: "list-row__icon" }, icon(ICONS.connectors, 18)),
			el(
				"div",
				{ class: "list-row__label" },
				el("div", { class: "list-row__title" }, "All connectors"),
				el(
					"div",
					{ class: "list-row__subtitle" },
					`${enabled} of ${total} enabled`,
				),
			),
			// Matches upstream: "on" unless every connector is disabled.
			switchControl("All connectors", enabled > 0, (checked) =>
				toggleAll(checked),
			),
		);
	}

	function group(title: string, items: ConnectorMeta[]): HTMLElement {
		return el(
			"div",
			{},
			el("div", { class: "group-title" }, title),
			el("ul", { class: "list" }, ...items.map(connectorItem)),
		);
	}

	function render(): void {
		refreshMaster();

		const popular = POPULAR_CONNECTORS.filter(matches);
		const others = OTHER_CONNECTORS.filter(matches);

		if (popular.length === 0 && others.length === 0) {
			mount(
				groups,
				el(
					"ul",
					{ class: "list" },
					el(
						"li",
						{ class: "list-row" },
						el(
							"div",
							{ class: "list-row__label" },
							el(
								"div",
								{ class: "list-row__subtitle" },
								"No connectors match.",
							),
						),
					),
				),
			);
			return;
		}

		mount(
			groups,
			...(popular.length > 0 ? [group("Popular services", popular)] : []),
			...(others.length > 0 ? [group("Other services", others)] : []),
		);
	}

	render();

	void (async () => {
		options = await upstreamOptions();
		const configured = await options?.read();
		disabled = { ...(configured?.disabledConnectors ?? {}) };
		overrides = (await options?.readOverrides()) ?? {};
		render();
	})();

	return section;
}
