import { getBrowser } from "@kit/shared/browser";
import { el, mount } from "@kit/shared/dom";
import { ICONS, type IconName, icon, SERVICE_ICONS } from "@kit/shared/icons";
import {
	applyPreviewTheme,
	type ModifiedTheme,
	type Scrobbler,
	type UpstreamThemes,
	upstreamScrobbleService,
	upstreamThemes,
} from "@kit/shared/upstream";
import { VERSION } from "@kit/shared/version";
import { connectorsSection } from "./connectors";
import { youtubeSection } from "./youtube";

type SectionId = "accounts" | "connectors" | "youtube" | "appearance" | "about";

const SECTIONS: { id: SectionId; label: string; icon: IconName }[] = [
	{ id: "accounts", label: "Accounts", icon: ICONS.accounts },
	{ id: "connectors", label: "Connectors", icon: ICONS.connectors },
	{ id: "youtube", label: "YouTube", icon: ICONS.youtube },
	{ id: "appearance", label: "Appearance", icon: ICONS.appearance },
	{ id: "about", label: "About", icon: ICONS.about },
];

let section: SectionId = "accounts";

const LASTFM_LABEL = "Last.fm";

/** Services Kit Scrobbler does not support yet — shown greyed out. */
const OTHER_SERVICES = [
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
		label: "Web Scrobbler",
		href: "https://github.com/web-scrobbler/web-scrobbler",
	},
	{ label: "GitHub", href: "https://github.com/" },
	{
		label: "CommandCode (deepseek-v4.1-flash)",
		href: "https://commandcode.ai/",
	},
	{ label: "Sprites", href: "https://sprites.dev/" },
	{ label: "Bun", href: "https://bun.sh/" },
	{ label: "Biome", href: "https://biomejs.dev/" },
	{ label: "Phosphor Icons", href: "https://phosphoricons.com/" },
];

type LastFmState =
	| { status: "checking" }
	| { status: "signed-out" }
	| { status: "signed-in"; sessionName: string; profileUrl: string }
	| { status: "unavailable" };

let lastFm: LastFmState = { status: "checking" };

const themes: UpstreamThemes | null = await upstreamThemes();
let theme: ModifiedTheme = themes ? await themes.getTheme() : "theme-system";

if (themes) {
	await themes.initializeThemes();
} else {
	applyPreviewTheme(theme);
}

/* Last.fm connection (via upstream's scrobble service) --------------------- */

async function lastFmScrobbler(): Promise<Scrobbler | null> {
	const service = await upstreamScrobbleService();
	return service?.getScrobblerByLabel(LASTFM_LABEL) ?? null;
}

/** Reads the stored session; `getSession()` also trades a pending auth token. */
async function refreshLastFm(): Promise<void> {
	const scrobbler = await lastFmScrobbler();
	if (!scrobbler) {
		lastFm = { status: "unavailable" };
		render();
		return;
	}

	try {
		const session = await scrobbler.getSession();
		lastFm = {
			status: "signed-in",
			sessionName: session.sessionName ?? "unknown",
			profileUrl: await scrobbler.getProfileUrl(),
		};
	} catch {
		lastFm = { status: "signed-out" };
	}
	render();
}

/** Upstream's `getAuthUrl()` stores a token; we just open the approval page. */
async function connectLastFm(): Promise<void> {
	const scrobbler = await lastFmScrobbler();
	const url = await scrobbler?.getAuthUrl();
	if (!url) {
		return;
	}
	const browser = await getBrowser();
	await browser?.tabs.create({ url });
}

async function disconnectLastFm(): Promise<void> {
	const scrobbler = await lastFmScrobbler();
	await scrobbler?.signOut();
	await refreshLastFm();
}

/**
 * Safari does not reload the options page when the user returns from Last.fm, so
 * — like upstream — we re-check on focus and trade the approved token.
 */
async function onWindowFocus(): Promise<void> {
	const scrobbler = await lastFmScrobbler();
	if (!scrobbler) {
		return;
	}
	try {
		if (await scrobbler.isReadyForGrantAccess()) {
			await scrobbler.getSession();
			await refreshLastFm();
		}
	} catch {
		// The user has not approved access yet.
	}
}

/* UI ----------------------------------------------------------------------- */

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
					icon(entry.icon, 16),
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

interface RowOptions {
	disabled?: boolean;
	icon?: IconName;
}

function row(
	label: string,
	subtitle: string | null,
	control: Node,
	options: RowOptions = {},
): HTMLElement {
	return el(
		"li",
		{ class: options.disabled ? "list-row is-disabled" : "list-row" },
		options.icon
			? el("span", { class: "list-row__icon" }, icon(options.icon, 18))
			: null,
		el(
			"div",
			{ class: "list-row__label" },
			el("div", { class: "list-row__title" }, label),
			subtitle ? el("div", { class: "list-row__subtitle" }, subtitle) : null,
		),
		control,
	);
}

function connectButton(onClick?: () => void, disabled = false): HTMLElement {
	return el(
		"button",
		{ class: "button button--primary", type: "button", onClick, disabled },
		"Connect",
	);
}

function lastFmRow(): HTMLElement {
	const withIcon = (subtitle: string, control: Node) =>
		row(LASTFM_LABEL, subtitle, control, {
			icon: SERVICE_ICONS[LASTFM_LABEL],
		});

	switch (lastFm.status) {
		case "checking":
			return withIcon(
				"Checking…",
				el("span", { class: "list-row__value" }, "…"),
			);
		case "unavailable":
			return withIcon(
				"Signed in through the Safari extension",
				connectButton(undefined, true),
			);
		case "signed-in":
			return withIcon(
				`Signed in as ${lastFm.sessionName}`,
				el(
					"div",
					{ class: "row-actions" },
					el(
						"a",
						{
							class: "button",
							href: lastFm.profileUrl,
							target: "_blank",
							rel: "noreferrer",
						},
						"Profile",
					),
					el(
						"button",
						{
							class: "button",
							type: "button",
							onClick: () => {
								void disconnectLastFm();
							},
						},
						"Sign out",
					),
				),
			);
		default:
			return withIcon(
				"Not connected",
				connectButton(() => {
					void connectLastFm();
				}),
			);
	}
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
			lastFmRow(),
			...OTHER_SERVICES.map((service) =>
				row(service, "Not available yet", connectButton(undefined, true), {
					disabled: true,
					icon: SERVICE_ICONS[service],
				}),
			),
		),
		el(
			"p",
			{ class: "accounts-note" },
			"Register your interest in adding more services at ",
			el(
				"a",
				{
					href: "https://github.com/mountainash/KitScrobbler/issues",
					target: "_blank",
					rel: "noreferrer",
				},
				"GitHub",
			),
		),
	);
}

function aboutSection(): HTMLElement {
	return el(
		"section",
		{},
		el("h2", { class: "content__heading" }, "About"),
		el("p", { class: "content__subtitle" }, "Kit Scrobbler"),
		el(
			"ul",
			{ class: "list" },
			row("Version", null, el("span", { class: "list-row__value" }, VERSION)),
			row(
				"Source Code",
				null,
				el(
					"a",
					{
						class: "list-row__value",
						href: "https://github.com/mountainash/KitScrobbler",
						target: "_blank",
						rel: "noreferrer",
					},
					"GitHub",
				),
			),
		),
		el("h3", { class: "content__heading" }, "Acknowledgements"),
		el("p", { class: "content__subtitle" }, "Thank you to these projects."),
		el(
			"ul",
			{ class: "list about-links" },
			...LINKS.map((link) =>
				row(
					link.label,
					null,
					el(
						"a",
						{ href: link.href, target: "_blank", rel: "noreferrer" },
						icon(ICONS.link, 15),
					),
				),
			),
		),
	);
}

function content(): HTMLElement {
	switch (section) {
		case "accounts":
			return accountsSection();
		case "connectors":
			return connectorsSection();
		case "youtube":
			return youtubeSection();
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

window.addEventListener("focus", () => {
	void onWindowFocus();
});

void refreshLastFm();
