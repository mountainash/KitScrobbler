import { el } from "@kit/shared/dom";
import { ICONS, icon } from "@kit/shared/icons";
import type { SavedEdit } from "@upstream/src/core/storage/options";
import type { PopupSong } from "./popup";

interface Field {
	node: HTMLLabelElement;
	input: HTMLInputElement;
}

function field(label: string, value: string): Field {
	const input = el("input", {
		class: "text-field",
		type: "text",
		value,
		placeholder: label,
		"aria-label": label,
	});

	return {
		node: el(
			"label",
			{ class: "edit__field" },
			el("span", { class: "edit__label" }, label),
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
 * Metadata editor, mirroring upstream's `edit.tsx`: correct the track data,
 * save it (upstream stores it by song id and reprocesses the song) or swap
 * artist and track.
 */
export function editView(options: EditViewOptions): HTMLElement {
	const track = field("Track", options.song.getTrack() ?? "");
	const artist = field("Artist", options.song.getArtist() ?? "");
	const album = field("Album", options.song.getAlbum() ?? "");
	const albumArtist = field(
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
	const swap = el(
		"button",
		{
			class: "button",
			type: "button",
			disabled: !valid(),
			title: "Swap artist and track",
			"aria-label": "Swap artist and track",
			onClick: () => {
				const data = read();
				options.onSave({
					...data,
					artist: data.track,
					track: data.artist,
				});
			},
		},
		icon(ICONS.swap, 16),
	);

	for (const target of [track, artist]) {
		target.input.addEventListener("input", () => {
			save.disabled = !valid();
			swap.disabled = !valid();
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
							class: "button button--plain",
							type: "button",
							onClick: () => options.onCancel(),
						},
						"Cancel",
					)
				: null,
			el("span", { class: "toolbar__spacer" }),
			swap,
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
