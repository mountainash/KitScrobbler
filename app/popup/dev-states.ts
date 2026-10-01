import type { ManagerTab } from "@kit/shared/upstream";
import * as ControllerMode from "@upstream/src/core/object/controller/controller-mode";
import type { PopupSong } from "./popup";

/** Inline SVG stand-ins for album art (no network, no extension assets). */
const ART_BLUE =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='144' height='144'%3E%3Crect width='144' height='144' fill='%230a84ff'/%3E%3Ccircle cx='72' cy='60' r='20' fill='%23fff' fill-opacity='0.9'/%3E%3Crect x='40' y='96' width='64' height='8' rx='4' fill='%23fff' fill-opacity='0.6'/%3E%3C/svg%3E";
const ART_PINK =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='144' height='144'%3E%3Crect width='144' height='144' fill='%23ff375f'/%3E%3Ccircle cx='72' cy='60' r='20' fill='%23fff' fill-opacity='0.9'/%3E%3Crect x='40' y='96' width='64' height='8' rx='4' fill='%23fff' fill-opacity='0.6'/%3E%3C/svg%3E";

interface SongOptions {
	track: string;
	artist: string;
	album?: string;
	albumArtist?: string;
	art?: string | null;
	loved?: boolean;
	playCount?: number;
	connector?: string;
}

/**
 * A test double for upstream's `ClonedSong`. It implements the popup's
 * {@link PopupSong} contract over fixture data — no upstream behaviour is copied.
 */
function song(options: SongOptions): PopupSong {
	return {
		getTrack: () => options.track,
		getArtist: () => options.artist,
		getAlbum: () => options.album ?? null,
		getAlbumArtist: () => options.albumArtist ?? null,
		getTrackArt: () => options.art ?? null,
		metadata: {
			userloved: options.loved ?? false,
			userPlayCount: options.playCount ?? 0,
		},
		connector: { label: options.connector ?? "Bandcamp" },
	};
}

/** A controller tab in the given mode; the song comes from the fixture, not here. */
function tab(mode: ManagerTab["mode"]): ManagerTab {
	return { tabId: -1, mode, permanentMode: mode, song: null };
}

export interface DevState {
	name: string;
	label: string;
	tab: ManagerTab;
	song: PopupSong | null;
	/** Open the metadata editor on first render. */
	editing?: boolean;
}

const awake = song({
	track: "Awake",
	artist: "Tycho",
	album: "Awake",
	art: ART_BLUE,
	playCount: 128,
});

const long = song({
	track: "The Ripening of the Fantastic Machine That Ate Tuesday",
	artist: "A Very Long Artist Name Featuring Someone Else And Another Person",
	album: "Collected Recordings From The Basement, Volume Twenty Seven",
	art: ART_PINK,
	playCount: 90210,
	connector: "YouTube Music",
});

export const DEV_STATES: DevState[] = [
	{
		name: "playing",
		label: "Playing",
		tab: tab(ControllerMode.Playing),
		song: awake,
	},
	{
		name: "playing-no-art",
		label: "Playing without artwork",
		tab: tab(ControllerMode.Playing),
		song: song({
			track: "No Artwork",
			artist: "Anonymous",
			album: "Unknown Album",
		}),
	},
	{
		name: "playing-long",
		label: "Long metadata (truncation)",
		tab: tab(ControllerMode.Playing),
		song: long,
	},
	{
		name: "paused",
		label: "Paused",
		tab: tab(ControllerMode.Paused),
		song: awake,
	},
	{
		name: "scrobbled",
		label: "Scrobbled",
		tab: tab(ControllerMode.Scrobbled),
		song: awake,
	},
	{
		name: "loved",
		label: "Loved",
		tab: tab(ControllerMode.Loved),
		song: song({
			track: "Awake",
			artist: "Tycho",
			album: "Awake",
			art: ART_BLUE,
			loved: true,
			playCount: 128,
		}),
	},
	{
		name: "unloved",
		label: "Unloved",
		tab: tab(ControllerMode.Unloved),
		song: awake,
	},
	{
		name: "skipped",
		label: "Skipped",
		tab: tab(ControllerMode.Skipped),
		song: awake,
	},
	{
		name: "empty",
		label: "Nothing playing",
		tab: tab(ControllerMode.Playing),
		song: null,
	},
	{
		name: "disabled",
		label: "Disabled for this site",
		tab: tab(ControllerMode.Disabled),
		song: null,
	},
	{
		name: "unsupported",
		label: "Unsupported site",
		tab: tab(ControllerMode.Unsupported),
		song: null,
	},
	{
		name: "edit",
		label: "Edit track details",
		tab: tab(ControllerMode.Playing),
		song: awake,
		editing: true,
	},
	{
		name: "unknown",
		label: "Unknown track (edit form)",
		tab: tab(ControllerMode.Unknown),
		song: song({
			track: "Ambient Track 04",
			artist: "Unknown Artist",
			album: "Untitled",
		}),
	},
];

export function devState(name: string): DevState | undefined {
	return DEV_STATES.find((state) => state.name === name);
}
