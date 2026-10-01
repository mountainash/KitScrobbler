import { el, mount } from "@kit/shared/dom";
import { ICONS, svgIcon } from "@kit/shared/icons";
import {
	applyPreviewTheme,
	getExtensionInfo,
	type ModifiedTheme,
	type UpstreamThemes,
	upstreamThemes,
} from "@kit/shared/upstream";

type SectionId = "appearance" | "accounts" | "about";

const SECTIONS: { id: SectionId; label: string; icon: string }[] = [
	{ id: "appearance", label: "Appearance", icon: ICONS.settings },
	{ id: "accounts", label: "Accounts", icon: ICONS.heart },
	{ id: "about", label: "About", icon: ICONS.info },
];

const SERVICES = [
	"Last.fm",
	"Libre.fm",
	"ListenBrainz",
	"Maloja",
	"Webhook",
	"Pleroma",
];

const THEMES: { value: ModifiedTheme; label: string }[] = [
	{ value: "theme-system", label: "System" },
	{ value: "theme-light", label: "Light" },
	{ value: "theme-dark", label: "Dark" },
];

const LINKS = [
	{
		label: "Kit Scrobbler on GitHub",
		href: "https://github.com/mountainash/KitScrobbler",
	},
	{
		label: "Web Scrobbler (upstream)",
		href: "https://github.com/web-scrobbler/web-scrobbler",
	},
	{ label: "Last.fm", href: "https://www.last.fm" },
];

let section: SectionId = "appearance";

const themes: UpstreamThemes | null = await upstreamThemes();
let theme: ModifiedTheme = themes ? await themes.getTheme() : "theme-system";
const info = await getExtensionInfo();

if (themes) {
	await themes.initializeThemes();
} else {
	applyPreviewTheme(theme);
}

function sidebar(): HTMLElement {
	return el(
		"aside",
		{ class: "sidebar" },
		el("h1", { class: "sidebar__title" }, "Kit Scrobbler"),
		el(
			"nav",
			{ class: "sidebar__nav" },
			...SECTIONS.map((entry) =>
				el(
					"button",
					{
						class: "sidebar__item",
						type: "button",
						"aria-current": entry.id === section ? "page" : "false",
						onClick: () => {
							section = entry.id;
							render();
						},
					},
					svgIcon(entry.icon, 16),
					el("span", {}, entry.label),
				),
			),
		),
	);
}

function segmented(
	options: { value: ModifiedTheme; label: string }[],
	current: ModifiedTheme,
	onSelect: (value: ModifiedTheme) => void,
): HTMLElement {
	const group = el("div", { class: "segmented", role: "tablist" });

	for (const option of options) {
		const item = el(
			"button",
			{
				class: "segmented__item",
				type: "button",
				role: "tab",
				"aria-selected": option.value === current ? "true" : "false",
			},
			option.label,
		);
		item.addEventListener("click", () => onSelect(option.value));
		group.append(item);
	}

	return group;
}

function row(label: string, subtitle: string, control: Node): HTMLElement {
	return el(
		"li",
		{ class: "list-row" },
		el(
			"div",
			{ class: "list-row__label" },
			el("div", { class: "list-row__title" }, label),
			el("div", { class: "list-row__subtitle" }, subtitle),
		),
		control,
	);
}

function appearanceSection(): HTMLElement {
	return el(
		"section",
		{},
		el("h2", { class: "content__heading" }, "Appearance"),
		el(
			"p",
			{ class: "content__subtitle" },
			"How Kit Scrobbler looks in Safari.",
		),
		el("div", { class: "group-title" }, "Theme"),
		el(
			"ul",
			{ class: "list" },
			row(
				"Theme",
				"Theme is shared with Web Scrobbler.",
				segmented(THEMES, theme, (value) => {
					theme = value;
					if (themes) {
						void themes.updateTheme(value);
					} else {
						applyPreviewTheme(value);
					}
					render();
				}),
			),
		),
	);
}

function accountsSection(): HTMLElement {
	return el(
		"section",
		{},
		el("h2", { class: "content__heading" }, "Accounts"),
		el(
			"p",
			{ class: "content__subtitle" },
			"Services Kit Scrobbler can scrobble to.",
		),
		el(
			"ul",
			{ class: "list" },
			...SERVICES.map((service) =>
				row(
					service,
					"Not connected",
					el(
						"button",
						{ class: "button button--primary", type: "button", disabled: true },
						"Connect",
					),
				),
			),
		),
		el(
			"p",
			{ class: "accounts-note" },
			"Account linking is coming in a later milestone.",
		),
	);
}

function aboutSection(): HTMLElement {
	return el(
		"section",
		{},
		el("h2", { class: "content__heading" }, "About"),
		el("p", { class: "content__subtitle" }, `${info.name} ${info.version}`),
		el(
			"ul",
			{ class: "list" },
			row(
				"Version",
				info.version,
				el("span", { class: "list-row__value" }, info.version),
			),
		),
		el(
			"div",
			{ class: "about-links" },
			...LINKS.map((link) =>
				el(
					"a",
					{ href: link.href, target: "_blank", rel: "noreferrer" },
					link.label,
				),
			),
		),
	);
}

function content(): HTMLElement {
	switch (section) {
		case "accounts":
			return accountsSection();
		case "about":
			return aboutSection();
		default:
			return appearanceSection();
	}
}

function render(): void {
	const root = document.querySelector<HTMLElement>("#options");
	if (!root) {
		return;
	}
	mount(root, sidebar(), el("main", { class: "content" }, content()));
}

render();
