import { el, mount } from "@kit/shared/dom";
import { ICONS, icon } from "@kit/shared/icons";
import { type UpstreamOptions, upstreamOptions } from "@kit/shared/upstream";
import type { ConnectorMeta } from "@upstream/src/core/connectors";
import connectors from "@upstream/src/core/connectors";

/**
 * Upstream sorts its connector list by label (`getSortedConnectors`). We sort the
 * same way here rather than importing that helper, which pulls in the storage
 * layer — and with it `webextension-polyfill` — just for a comparator.
 */
const ALL_CONNECTORS: ConnectorMeta[] = [...connectors].sort((a, b) =>
	a.label.localeCompare(b.label),
);

function switchInput(
	label: string,
	checked: boolean,
	onChange: (checked: boolean) => void,
): HTMLInputElement {
	const input = el("input", {
		type: "checkbox",
		switch: true,
		checked,
		"aria-label": label,
	});
	input.addEventListener("change", () => onChange(input.checked));
	return input;
}

/**
 * The Connectors page.
 *
 * A connector is enabled unless it is listed in `disabledConnectors` in
 * upstream's `OPTIONS` storage — the same shape upstream's own options page
 * reads and writes, via the same `setConnectorEnabled` / `setAllConnectorsEnabled`
 * helpers.
 */
export function connectorsSection(): HTMLElement {
	let disabled: Record<string, boolean> = {};
	let query = "";

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
			"Turn individual sites on or off. Disabled connectors are skipped in new tabs.",
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

	function enabledCount(): number {
		return ALL_CONNECTORS.length - Object.keys(disabled).length;
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

	async function persist(
		apply: (options: UpstreamOptions) => Promise<void>,
	): Promise<void> {
		const options = await upstreamOptions();
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
		render();
		void persist((options) => options.setConnectorEnabled(connector, enabled));
	}

	function toggleAll(enabled: boolean): void {
		disabled = enabled
			? {}
			: Object.fromEntries(ALL_CONNECTORS.map((c) => [c.id, true]));
		render();
		void persist((options) => options.setAllConnectorsEnabled(enabled));
	}

	function masterRow(): HTMLElement {
		const total = ALL_CONNECTORS.length;
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

	function connectorRow(connector: ConnectorMeta): HTMLElement {
		const enabled = !disabled[connector.id];
		return el(
			"li",
			{ class: "list-row" },
			el(
				"div",
				{ class: "list-row__label" },
				el("div", { class: "list-row__title" }, connector.label),
				el("div", { class: "list-row__subtitle" }, connector.id),
			),
			switchInput(connector.label, enabled, (checked) =>
				toggle(connector, checked),
			),
		);
	}

	function render(): void {
		mount(masterList, masterRow());

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
		mount(list, ...visible.map(connectorRow));
	}

	render();

	void (async () => {
		const options = await upstreamOptions();
		const configured = await options?.read();
		disabled = { ...(configured?.disabledConnectors ?? {}) };
		render();
	})();

	return section;
}
