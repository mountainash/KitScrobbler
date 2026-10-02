import { el, mount, segmentedControl } from "@kit/shared/dom";
import { applyPreviewTheme } from "@kit/shared/upstream";
import { DEV_STATES, type DevState } from "./dev-states";

/**
 * The popup state gallery. Each state is rendered in an iframe pointed at
 * `index.html?state=<name>`, so what you see is the real popup bundle, not a
 * reimplementation of it.
 */
const params = new URLSearchParams(location.search);
let theme = params.get("theme") ?? "theme-system";

const THEMES = [
	{ value: "theme-system", label: "System" },
	{ value: "theme-light", label: "Light" },
	{ value: "theme-dark", label: "Dark" },
];

const grid = document.querySelector<HTMLElement>("#grid");
const themeSlot = document.querySelector<HTMLElement>("#theme");

function cell(state: DevState): HTMLElement {
	const frame = el("iframe", {
		class: "dev__frame",
		src: `./index.html?state=${encodeURIComponent(state.name)}&theme=${encodeURIComponent(theme)}`,
		title: state.label,
	});

	return el(
		"figure",
		{ class: "dev__cell" },
		el(
			"figcaption",
			{ class: "dev__label" },
			el("span", { class: "dev__name" }, state.name),
			el("span", { class: "dev__title" }, state.label),
		),
		frame,
	);
}

function render(): void {
	if (!grid) {
		return;
	}

	applyPreviewTheme(theme);
	mount(grid, ...DEV_STATES.map(cell));

	if (themeSlot) {
		mount(
			themeSlot,
			segmentedControl(
				THEMES,
				theme,
				(value) => {
					theme = value;
					render();
				},
				"Theme",
			),
		);
	}
}

document.querySelector("#reload")?.addEventListener("click", () => {
	render();
});

render();
