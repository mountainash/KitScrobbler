import { connectorMatches } from "@kit/shared/connector-matches";
import { el, mount } from "@kit/shared/dom";
import { ICONS, icon } from "@kit/shared/icons";
import {
	type OverrideKey,
	type UpstreamOptions,
	upstreamOptions,
} from "@kit/shared/upstream";
import type { ConnectorMeta } from "@upstream/src/core/connectors";
import connectors from "@upstream/src/core/connectors";
import type { ConnectorsOverrideOptionValues } from "@upstream/src/core/storage/options";
import type { CustomPatterns } from "@upstream/src/core/storage/wrapper";

/**
 * Upstream sorts its connector list by label (`getSortedConnectors`). We sort the
 * same way here rather than importing that helper, which pulls in the storage
 * layer — and with it `webextension-polyfill` — just for a comparator.
 */
const ALL_CONNECTORS: ConnectorMeta[] = [...connectors].sort((a, b) =>
	a.label.localeCompare(b.label),
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

function switchInput(
	label: string,
	checked: boolean,
	onChange: (checked: boolean) => void,
	disabled = false,
): HTMLInputElement {
	const input = el("input", {
		type: "checkbox",
		switch: true,
		checked,
		disabled,
		"aria-label": label,
	});
	if (!disabled) {
		input.addEventListener("change", () => onChange(input.checked));
	}
	return input;
}

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

/** Tri-state override: "default" inherits the global setting. */
function overrideSelect(
	label: string,
	value: boolean | undefined,
	onChange: (value: boolean | undefined) => void,
): HTMLSelectElement {
	return select(
		label,
		[
			{ value: "default", label: "Default" },
			{ value: "on", label: "On" },
			{ value: "off", label: "Off" },
		],
		value === undefined ? "default" : value ? "on" : "off",
		(next) => onChange(next === "default" ? undefined : next === "on"),
	);
}

/**
 * The Connectors page: enable/disable, per-connector overrides and custom URL
 * patterns — all read and written through upstream's own helpers, so the
 * background and content scripts honour them unchanged.
 */
export function connectorsSection(): HTMLElement {
	let disabled: Record<string, boolean> = {};
	let overrides: Record<string, ConnectorsOverrideOptionValues> = {};
	let patterns: CustomPatterns = {};
	let query = "";
	let options: UpstreamOptions | null = null;

	const masterList = el("ul", { class: "list" });
	const list = el("ul", { class: "list" });

	const search = el("input", {
		class: "text-field",
		type: "search",
		placeholder: "Search connectors",
		"aria-label": "Search connectors",
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
			"Turn sites on or off, and override scrobbling behaviour per site.",
		),
		el(
			"div",
			{ class: "connectors__toolbar" },
			el("span", { class: "connectors__search-icon" }, icon(ICONS.search, 16)),
			search,
		),
		masterList,
		list,
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

	function setPatterns(connector: ConnectorMeta, next: string[]): void {
		patterns = { ...patterns, [connector.id]: next };
		void persist((store) => store.setPatterns(connector.id, next));
	}

	function patternRows(connector: ConnectorMeta): HTMLElement {
		const current = patterns[connector.id] ?? [];

		return el(
			"div",
			{ class: "connector__patterns" },
			...current.map((pattern, index) =>
				el(
					"div",
					{ class: "connector__pattern" },
					el("input", {
						class: "text-field",
						type: "text",
						value: pattern,
						placeholder: "*://example.com/*",
						"aria-label": `Custom URL pattern ${index + 1}`,
						// Committed on change rather than every keystroke: sync storage
						// has a write-per-minute quota.
						onChange: (event) => {
							const next = [...(patterns[connector.id] ?? [])];
							next[index] = (event.target as HTMLInputElement).value;
							setPatterns(connector, next);
						},
					}),
					el(
						"button",
						{
							class: "button",
							type: "button",
							title: "Remove pattern",
							"aria-label": "Remove pattern",
							onClick: () => {
								const next = [...(patterns[connector.id] ?? [])];
								next.splice(index, 1);
								setPatterns(connector, next);
								render();
							},
						},
						icon("trash", 14),
					),
				),
			),
			el(
				"button",
				{
					class: "button",
					type: "button",
					onClick: () => {
						setPatterns(connector, [...(patterns[connector.id] ?? []), ""]);
						render();
					},
				},
				icon("plus", 14),
				"Add pattern",
			),
		);
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
					overrideSelect(toggle.label, override[toggle.key], (value) =>
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
			el("h3", { class: "connector__group-title" }, "Custom URL patterns"),
			el(
				"p",
				{ class: "connector__row-hint" },
				"Extra URLs this connector should match, in order.",
			),
			patternRows(connector),
		);
	}

	function summarySwitch(connector: ConnectorMeta): HTMLInputElement {
		const input = el("input", {
			type: "checkbox",
			switch: true,
			checked: !disabled[connector.id],
			"aria-label": connector.label,
		});

		// Safari toggles a <details> when anything inside <summary> is clicked, so
		// upstream prevents the default and applies the state itself; we do the same.
		input.addEventListener("click", (event) => {
			event.preventDefault();
			input.checked = !input.checked;
			toggle(connector, input.checked);
		});

		return input;
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
				switchInput(connector.label, false, () => {}, true),
			),
		);
	}

	function connectorItem(connector: ConnectorMeta): HTMLElement {
		if (UNREACHABLE.has(connector.id)) {
			return unavailableItem(connector);
		}

		const node = el("details", { class: "connector" });
		node.append(
			el(
				"summary",
				{ class: "list-row connector__summary" },
				el("span", { class: "connector__chevron" }, icon("caret-right", 16)),
				el(
					"div",
					{ class: "list-row__label" },
					el("div", { class: "list-row__title" }, connector.label),
					el("div", { class: "list-row__subtitle" }, connector.id),
				),
				summarySwitch(connector),
			),
		);

		// Built on first expand, like upstream.
		node.addEventListener("toggle", () => {
			if (node.open && !node.dataset.built) {
				node.dataset.built = "true";
				node.append(details(connector));
			}
		});

		return el("li", { class: "connector-item" }, node);
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
			switchInput("All connectors", enabled > 0, (checked) =>
				toggleAll(checked),
			),
		);
	}

	function render(): void {
		refreshMaster();

		const visible = ALL_CONNECTORS.filter(matches);
		if (visible.length === 0) {
			mount(
				list,
				el(
					"li",
					{ class: "list-row" },
					el(
						"div",
						{ class: "list-row__label" },
						el("div", { class: "list-row__subtitle" }, "No connectors match."),
					),
				),
			);
			return;
		}
		mount(list, ...visible.map(connectorItem));
	}

	render();

	void (async () => {
		options = await upstreamOptions();
		const configured = await options?.read();
		disabled = { ...(configured?.disabledConnectors ?? {}) };
		overrides = (await options?.readOverrides()) ?? {};
		patterns = (await options?.readPatterns()) ?? {};
		render();
	})();

	return section;
}
