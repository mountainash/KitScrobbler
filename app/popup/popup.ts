import { extensionUrl } from "@kit/shared/browser";
import { el, mount } from "@kit/shared/dom";
import { ICONS, svgIcon } from "@kit/shared/icons";
import {
	applyPreviewTheme,
	getCurrentTab,
	loadClonedSong,
	type ManagerTab,
	type UpstreamCommunication,
	upstreamCommunication,
	upstreamThemes,
} from "@kit/shared/upstream";
import type ClonedSong from "@upstream/src/core/object/cloned-song";
import * as ControllerMode from "@upstream/src/core/object/controller/controller-mode";

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

function nowPlaying(
	tab: ManagerTab,
	song: ClonedSong | null,
	comm: UpstreamCommunication | null,
): HTMLElement {
	const trackArt = song?.getTrackArt() ?? null;
	const album = song?.getAlbum() ?? null;

	return el(
		"section",
		{ class: "now-playing" },
		el(
			"div",
			{ class: "now-playing__art" },
			trackArt
				? el("img", { class: "now-playing__img", src: trackArt, alt: "" })
				: el(
						"div",
						{ class: "now-playing__placeholder" },
						svgIcon(ICONS.note, 24),
					),
		),
		el(
			"div",
			{ class: "now-playing__details" },
			el(
				"div",
				{ class: "now-playing__track" },
				song?.getTrack() ?? "Nothing playing",
			),
			el("div", { class: "now-playing__artist" }, song?.getArtist() ?? "—"),
			album ? el("div", { class: "now-playing__album" }, album) : null,
			el(
				"div",
				{ class: "now-playing__meta" },
				el(
					"span",
					{ class: "now-playing__connector" },
					song?.connector.label ?? "Unknown",
				),
				el("span", { class: "toolbar__spacer" }),
				el("span", {}, `${song?.metadata.userPlayCount ?? 0} scrobbles`),
			),
		),
		el(
			"div",
			{ class: "now-playing__controls" },
			iconButton("Love", ICONS.heart, Boolean(song?.metadata.userloved), () => {
				void comm?.sendBackgroundMessage(tab.tabId, {
					type: "toggleLove",
					payload: {
						isLoved: !song?.metadata.userloved,
						shouldShowNotification: false,
					},
				});
			}),
			iconButton("Skip", ICONS.skip, false, () => {
				void comm?.sendBackgroundMessage(tab.tabId, {
					type: "skipCurrentSong",
					payload: undefined,
				});
			}),
			iconButton("Edit", ICONS.edit, false, () => {
				void comm?.sendBackgroundMessage(tab.tabId, {
					type: "setEditState",
					payload: true,
				});
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

function disabledView(
	tab: ManagerTab,
	comm: UpstreamCommunication | null,
): HTMLElement {
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
						void comm
							?.sendBackgroundMessage(tab.tabId, {
								type: "setConnectorState",
								payload: true,
							})
							.then(() => render());
					},
				},
				"Enable for this site",
			),
		),
	);
}

function body(
	tab: ManagerTab,
	song: ClonedSong | null,
	comm: UpstreamCommunication | null,
): HTMLElement {
	switch (tab.mode) {
		case ControllerMode.Unsupported:
			return stateView(
				ICONS.info,
				"Not supported yet",
				"Kit Scrobbler does not recognise this website.",
			);
		case ControllerMode.Disabled:
			return disabledView(tab, comm);
		default:
			return nowPlaying(tab, song, comm);
	}
}

async function render(): Promise<void> {
	const container = document.querySelector<HTMLElement>("#popup");
	if (!container) {
		return;
	}

	const tab = await getCurrentTab();
	const ClonedSong = await loadClonedSong();
	const song =
		tab.song && ClonedSong ? new ClonedSong(tab.song, tab.tabId) : null;
	const comm = await upstreamCommunication();

	mount(container, header(), body(tab, song, comm));
}

const themes = await upstreamThemes();
if (themes) {
	await themes.initializeThemes();
} else {
	applyPreviewTheme("theme-system");
}

await render();

const comm = await upstreamCommunication();
comm?.setupPopupListeners(
	comm.popupListener({
		type: "currentTab",
		fn: () => {
			void render();
		},
	}),
);
