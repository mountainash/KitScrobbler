import type { SongData } from "./types";

/** A flattened, render-ready view of a song (mirrors upstream's `BaseSong` accessors). */
export interface SongView {
	artist: string | null;
	track: string | null;
	album: string | null;
	albumArtist: string | null;
	trackArt: string | null;
	duration: number | null;
	loved: boolean;
	playCount: number;
	connectorLabel: string;
	correctedByUser: boolean;
}

/**
 * Projects a serialized upstream song into the values our UI needs, replicating
 * upstream's `getArtist()`/`getTrack()`/… preference order (processed before parsed).
 */
export function toSongView(song: SongData | null | undefined): SongView | null {
	if (!song) {
		return null;
	}

	const { parsed, processed, metadata, flags, connector } = song;

	return {
		artist: processed.artist ?? parsed.artist ?? null,
		track: processed.track ?? parsed.track ?? null,
		album: processed.album ?? parsed.album ?? null,
		albumArtist: processed.albumArtist ?? parsed.albumArtist ?? null,
		trackArt: parsed.trackArt ?? metadata.trackArtUrl ?? null,
		duration: parsed.duration ?? processed.duration ?? null,
		loved: Boolean(metadata.userloved),
		playCount: metadata.userPlayCount ?? 0,
		connectorLabel: connector?.label ?? "Unknown",
		correctedByUser: Boolean(flags?.isCorrectedByUser),
	};
}

/** Formats a duration in seconds as `m:ss`. */
export function formatDuration(seconds: number | null): string {
	if (!seconds || seconds <= 0) {
		return "—";
	}
	const minutes = Math.floor(seconds / 60);
	const rest = Math.floor(seconds % 60);
	return `${minutes}:${rest.toString().padStart(2, "0")}`;
}
