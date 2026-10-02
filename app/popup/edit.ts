import { el } from "@kit/shared/dom";
import { ICONS, type IconName, icon } from "@kit/shared/icons";
import type { SavedEdit } from "@upstream/src/core/storage/options";
import type { PopupSong } from "./popup";

interface Field {
	node: HTMLLabelElement;
	input: HTMLInputElement;
}

/**
 * One metadata field: a glyph, the value, and the label kept for screen readers
 * only, so each row is a single control tall.
 */
function field(iconName: IconName, label: string, value: string): Field {
	const input = el("input", {
		class: "text-field",
		type: "text",
		value,
		placeholder: label,
	});

	return {
		node: el(
			"label",
			{ class: "input-group" },
			icon(iconName, 14),
			el("span", { class: "sr-only" }, label),
			input,
		),
		input,
	};
}

export interface EditViewOptions {
	song: PopupSong;
	/** Show a cancel button — only when the user opened the editor themselves. */
	showCancel: boolean;
	onSave: (data: SavedEdit) => void;
	onCancel: () => void;
}

/**
 * Metadata editor, mirroring upstream's `edit.tsx`: correct the track data and
 * save it (upstream stores it by song id and reprocesses the song).
 */
export function editView(options: EditViewOptions): HTMLElement {
	const track = field(ICONS.track, "Track", options.song.getTrack() ?? "");
	const artist = field(ICONS.artist, "Artist", options.song.getArtist() ?? "");
	const album = field(ICONS.album, "Album", options.song.getAlbum() ?? "");
	const albumArtist = field(
		ICONS.albumArtist,
		"Album artist",
		options.song.getAlbumArtist() ?? "",
	);

	const read = (): SavedEdit => ({
		track: track.input.value,
		artist: artist.input.value,
		album: album.input.value || null,
		albumArtist: albumArtist.input.value || null,
	});

	const valid = () => Boolean(track.input.value && artist.input.value);

	const save = el(
		"button",
		{
			class: "button button--primary",
			type: "button",
			disabled: !valid(),
			title: "Save",
			"aria-label": "Save",
			onClick: () => options.onSave(read()),
		},
		icon(ICONS.check, 16),
	);

	for (const target of [track, artist]) {
		target.input.addEventListener("input", () => {
			save.disabled = !valid();
		});
	}

	const view = el(
		"section",
		{ class: "edit" },
		el("h2", { class: "edit__title" }, "Edit track"),
		track.node,
		artist.node,
		album.node,
		albumArtist.node,
		el(
			"div",
			{ class: "edit__controls" },
			options.showCancel
				? el(
						"button",
						{
							class: "button button--plain button--small",
							type: "button",
							onClick: () => options.onCancel(),
						},
						"Cancel",
					)
				: null,
			el("span", { class: "toolbar__spacer" }),
			save,
		),
	);

	view.addEventListener("keydown", (event) => {
		if (event instanceof KeyboardEvent && event.key === "Enter" && valid()) {
			event.preventDefault();
			options.onSave(read());
		}
	});

	return view;
}
