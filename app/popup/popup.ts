import {
	extensionUrl,
	isExtensionContext,
	openOptionsPage,
} from "@kit/shared/browser";
import { el, mount } from "@kit/shared/dom";
import { connectorIcon, ICONS, icon } from "@kit/shared/icons";
import {
	applyPreviewTheme,
	getCurrentTab,
	loadClonedSong,
	type ManagerTab,
	type UpstreamCommunication,
	upstreamCommunication,
	upstreamSavedEdits,
	upstreamThemes,
} from "@kit/shared/upstream";
import type ClonedSong from "@upstream/src/core/object/cloned-song";
import * as ControllerMode from "@upstream/src/core/object/controller/controller-mode";
import type { SavedEdit } from "@upstream/src/core/storage/options";
import { editView } from "./edit";

/**
 * The slice of upstream's `ClonedSong` that the popup renders.
 *
 * Upstream's class satisfies this structurally, so we pass it straight through;
 * the dev harness (`dev-states.ts`) supplies plain test doubles instead — it
 * cannot use `ClonedSong`, whose module imports `webextension-polyfill` and
 * therefore throws outside an extension.
 */
export interface PopupSong {
	getTrack(): string | null | undefined;
	getArtist(): string | null | undefined;
	getAlbum(): string | null | undefined;
	getAlbumArtist(): string | null | undefined;
	getTrackArt(): string | null;
	metadata: { userloved?: boolean; userPlayCount?: number };
	connector: { id?: string; label: string };
}

function header(): HTMLElement {
	const optionsUrl = extensionUrl("src/ui/options/index.html");

	return el(
		"header",
		{ class: "popup__header" },
		el("span", { class: "popup__title" }, "Kit Scrobbler"),
		el("span", { class: "toolbar__spacer" }),
		el(
			"a",
			{
				class: "popup__settings",
				href: optionsUrl,
				title: "Settings",
				"aria-label": "Settings",
				// A plain anchor does not open from a popup, so we prevent the
				// default and ask the browser for the options page — upstream's
				// PopupAnchor creates a tab for the same reason.
				onClick: (event) => {
					event.preventDefault();
					void openOptionsPage(optionsUrl);
				},
			},
			icon(ICONS.settings, 16),
		),
	);
}

function iconButton(
	label: string,
	name: string,
	onClick: () => void,
): HTMLElement {
	const node = el("button", {
		class: "icon-button",
		type: "button",
		title: label,
		"aria-label": label,
		onClick,
	});
	node.append(icon(name, 16));
	return node;
}

/**
 * The love toggle. Loving shakes the heart and, as the shake lands, fills it in
 * the brand red — upstream re-renders the popup shortly after, which keeps the
 * filled heart from the saved state.
 */
function loveButton(loved: boolean, onToggle: () => void): HTMLElement {
	const glyph = icon(ICONS.heart, 16, loved ? "fill" : "regular");
	const node = el(
		"button",
		{
			class: loved ? "icon-button is-active" : "icon-button",
			type: "button",
			title: "Love",
			"aria-label": "Love",
			onClick: () => {
				if (!loved) {
					node.classList.add("is-loving");
					glyph.addEventListener(
						"animationend",
						() => {
							node.classList.remove("is-loving");
							node.classList.add("is-active");
							glyph.classList.replace("ph", "ph-fill");
						},
						{ once: true },
					);
				}
				onToggle();
			},
		},
		glyph,
	);
	return node;
}

/** The playing connector's glyph, then its name. */
function connectorLabel(
	connector: PopupSong["connector"] | undefined,
): HTMLElement {
	return el(
		"span",
		{ class: "now-playing__connector" },
		icon(connectorIcon(connector?.id), 12),
		connector?.label ?? "Unknown",
	);
}

function nowPlaying(
	tab: ManagerTab,
	song: PopupSong | null,
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
						icon(ICONS.note, 24),
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
				connectorLabel(song?.connector),
				el("span", { class: "toolbar__spacer" }),
				el(
					"span",
					{ class: "now-playing__scrobbles" },
					`${song?.metadata.userPlayCount ?? 0}`,
					icon(ICONS.scrobbles, 12),
				),
			),
		),
		el(
			"div",
			{ class: "now-playing__controls" },
			loveButton(Boolean(song?.metadata.userloved), () => {
				void comm?.sendBackgroundMessage(tab.tabId, {
					type: "toggleLove",
					payload: {
						isLoved: !song?.metadata.userloved,
						shouldShowNotification: false,
					},
				});
			}),
			iconButton("Skip", ICONS.skip, () => {
				void comm?.sendBackgroundMessage(tab.tabId, {
					type: "skipCurrentSong",
					payload: undefined,
				});
			}),
			iconButton("Edit", ICONS.edit, () => {
				beginEditing();
			}),
		),
	);
}

function stateView(
	name: string,
	title: string,
	text: string,
	actions?: HTMLElement,
): HTMLElement {
	return el(
		"section",
		{ class: "state" },
		el("div", { class: "state__icon" }, icon(name, 28)),
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
		ICONS.disabled,
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
	song: PopupSong | null,
	comm: UpstreamCommunication | null,
): HTMLElement {
	switch (tab.mode) {
		case ControllerMode.Unsupported:
			return stateView(
				ICONS.unsupported,
				"Not supported yet",
				"Kit Scrobbler does not recognise this website.",
			);
		case ControllerMode.Disabled:
			return disabledView(tab, comm);
		default:
			return nowPlaying(tab, song, comm);
	}
}

const params = new URLSearchParams(location.search);

interface ResolvedState {
	tab: ManagerTab;
	song: PopupSong | null;
	/** The real upstream song, available only inside an extension. */
	clonedSong: ClonedSong | null;
	/** Whether the editor should be open on first render (dev fixtures). */
	editing: boolean;
}

/**
 * Outside an extension, `?state=<name>` swaps in a fixture from the dev harness
 * so `dev.html` can show every popup state side by side.
 *
 * The whole path is compiled out of production builds: our Bun.build defines
 * `NODE_ENV` as `"production"` (and Bun's dev server supplies `"development"`),
 * so the fixtures never ship to the App Store.
 */
async function resolveDevState(): Promise<ResolvedState | undefined> {
	const name = params.get("state");
	if (!name) {
		return undefined;
	}
	const { devState } = await import("./dev-states");
	const state = devState(name);
	if (!state) {
		return undefined;
	}
	return {
		tab: state.tab,
		song: state.song,
		clonedSong: null,
		editing: state.editing ?? false,
	};
}

async function resolveState(): Promise<ResolvedState> {
	if (process.env.NODE_ENV !== "production" && !isExtensionContext()) {
		const devState = await resolveDevState();
		if (devState) {
			return devState;
		}
	}

	const tab = await getCurrentTab();
	const ClonedSong = await loadClonedSong();
	const clonedSong =
		tab.song && ClonedSong ? new ClonedSong(tab.song, tab.tabId) : null;
	return { tab, song: clonedSong, clonedSong, editing: false };
}

/* Editing ------------------------------------------------------------------ */

let current: ResolvedState | null = null;
let userEditing = false;
let editKeepAlive: ReturnType<typeof setInterval> | undefined;

async function sendEditState(payload: boolean): Promise<void> {
	const comm = await upstreamCommunication();
	if (!comm || !current) {
		return;
	}
	await comm.sendBackgroundMessage(current.tab.tabId, {
		type: "setEditState",
		payload,
	});
}

function beginEditing(): void {
	userEditing = true;
	void sendEditState(true);

	// The content controller drops the editing flag after a few seconds, so
	// upstream's popup keeps re-asserting it while the editor is open.
	if (editKeepAlive) {
		clearInterval(editKeepAlive);
	}
	editKeepAlive = setInterval(() => {
		void sendEditState(true);
	}, 1000);

	void render();
}

function endEditing(): void {
	userEditing = false;
	if (editKeepAlive) {
		clearInterval(editKeepAlive);
		editKeepAlive = undefined;
	}
	void sendEditState(false);
	void render();
}

/** Saves through upstream (`savedEdits.saveSongInfo`) then reprocesses the song. */
async function applyEdit(data: SavedEdit): Promise<void> {
	if (current?.clonedSong) {
		const savedEdits = await upstreamSavedEdits();
		await savedEdits?.saveSongInfo(current.clonedSong, data);

		const comm = await upstreamCommunication();
		await comm?.sendBackgroundMessage(current.tab.tabId, {
			type: "reprocessSong",
			payload: undefined,
		});
	}
	endEditing();
}

/* Rendering ---------------------------------------------------------------- */

function content(
	state: ResolvedState,
	comm: UpstreamCommunication | null,
): HTMLElement {
	const forced = state.tab.mode === ControllerMode.Unknown;
	if ((userEditing || state.editing || forced) && state.song) {
		return editView({
			song: state.song,
			showCancel: !forced,
			onSave: (data) => {
				void applyEdit(data);
			},
			onCancel: () => endEditing(),
		});
	}
	return body(state.tab, state.song, comm);
}

async function render(): Promise<void> {
	const container = document.querySelector<HTMLElement>("#popup");
	if (!container) {
		return;
	}

	current = await resolveState();
	const comm = await upstreamCommunication();

	mount(container, header(), content(current, comm));
}

const themes = await upstreamThemes();
if (themes) {
	await themes.initializeThemes();
} else {
	applyPreviewTheme(params.get("theme") ?? "theme-system");
}

await render();

window.addEventListener("pagehide", () => {
	if (userEditing) {
		void sendEditState(false);
	}
});

const comm = await upstreamCommunication();
comm?.setupPopupListeners(
	comm.popupListener({
		type: "currentTab",
		fn: () => {
			void render();
		},
	}),
);
