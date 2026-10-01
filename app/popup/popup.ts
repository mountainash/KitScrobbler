import { extensionUrl } from "@kit/shared/browser";
import { el, mount } from "@kit/shared/dom";
import { ICONS, svgIcon } from "@kit/shared/icons";
import { onMessage, sendToTab } from "@kit/shared/messaging";
import { ControllerMode } from "@kit/shared/modes";
import { type SongView, toSongView } from "@kit/shared/song";
import { applyTheme, getActiveTab, getTheme } from "@kit/shared/storage";
import type { TabState } from "@kit/shared/types";

function header(): HTMLElement {
	return el(
		"header",
		{ class: "popup__header" },
		el("span", { class: "popup__title" }, "Kit Scrobbler"),
		el("span", { class: "toolbar__spacer" }),
		el(
			"a",
			{
				class: "popup__settings",
				href: extensionUrl("src/ui/options/index.html"),
				title: "Settings",
				"aria-label": "Settings",
			},
			svgIcon(ICONS.settings, 16),
		),
	);
}

function iconButton(
	label: string,
	markup: string,
	active: boolean,
	onClick: () => void,
): HTMLElement {
	const node = el("button", {
		class: active ? "icon-button is-active" : "icon-button",
		type: "button",
		title: label,
		"aria-label": label,
		onClick,
	});
	node.append(svgIcon(markup, 16));
	return node;
}

function nowPlaying(tab: TabState, song: SongView | null): HTMLElement {
	const placeholderIcon = svgIcon(ICONS.note, 24);

	return el(
		"section",
		{ class: "now-playing" },
		el(
			"div",
			{ class: "now-playing__art" },
			song?.trackArt
				? el("img", { class: "now-playing__img", src: song.trackArt, alt: "" })
				: el("div", { class: "now-playing__placeholder" }, placeholderIcon),
		),
		el(
			"div",
			{ class: "now-playing__details" },
			el(
				"div",
				{ class: "now-playing__track" },
				song?.track ?? "Nothing playing",
			),
			el("div", { class: "now-playing__artist" }, song?.artist ?? "—"),
			song?.album
				? el("div", { class: "now-playing__album" }, song.album)
				: null,
			el(
				"div",
				{ class: "now-playing__meta" },
				el(
					"span",
					{ class: "now-playing__connector" },
					song?.connectorLabel ?? "Unknown",
				),
				el("span", { class: "toolbar__spacer" }),
				el("span", {}, `${song?.playCount ?? 0} scrobbles`),
			),
		),
		el(
			"div",
			{ class: "now-playing__controls" },
			iconButton("Love", ICONS.heart, Boolean(song?.loved), () => {
				void sendToTab(tab.tabId, "toggleLove", {
					isLoved: !song?.loved,
					shouldShowNotification: false,
				});
			}),
			iconButton("Skip", ICONS.skip, false, () => {
				void sendToTab(tab.tabId, "skipCurrentSong", undefined);
			}),
			iconButton("Edit", ICONS.edit, false, () => {
				void sendToTab(tab.tabId, "setEditState", true);
			}),
		),
	);
}

function stateView(
	markup: string,
	title: string,
	text: string,
	actions?: HTMLElement,
): HTMLElement {
	return el(
		"section",
		{ class: "state" },
		el("div", { class: "state__icon" }, svgIcon(markup, 28)),
		el("h1", { class: "state__title" }, title),
		el("p", { class: "state__text" }, text),
		actions ?? null,
	);
}

function disabledView(tab: TabState): HTMLElement {
	return stateView(
		ICONS.info,
		"Scrobbling disabled",
		"Kit Scrobbler is turned off for this site.",
		el(
			"div",
			{ class: "state__actions" },
			el(
				"button",
				{
					class: "button button--primary",
					type: "button",
					onClick: () => {
						void sendToTab(tab.tabId, "setConnectorState", true).then(render);
					},
				},
				"Enable for this site",
			),
		),
	);
}

function body(tab: TabState): HTMLElement {
	switch (tab.mode) {
		case ControllerMode.Unsupported:
			return stateView(
				ICONS.info,
				"Not supported yet",
				"Kit Scrobbler does not recognise this website.",
			);
		case ControllerMode.Disabled:
			return disabledView(tab);
		default:
			return nowPlaying(tab, toSongView(tab.song));
	}
}

async function render(): Promise<void> {
	const container = document.querySelector<HTMLElement>("#popup");
	if (!container) {
		return;
	}
	const tab = await getActiveTab();
	mount(container, header(), body(tab));
}

applyTheme(await getTheme());
await render();

await onMessage((message) => {
	if (message.type === "currentTab") {
		void render();
	}
});
