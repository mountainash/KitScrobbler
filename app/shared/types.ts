/**
 * Structural views of the upstream data Kit Scrobbler consumes.
 *
 * These deliberately mirror upstream's `CloneableSong` / `ManagerTab` shapes
 * instead of importing them. Upstream's type graph assumes its own
 * `node_modules` and ambient declarations (`src/types/declaration.d.ts`), and
 * pulling that into our program forces us to install and appease all of it.
 * The *runtime* data is still produced by the submodule — only the compile-time
 * contract is declared here. See AGENTS.md.
 */

export interface ParsedSongData {
	artist?: string | null;
	track?: string | null;
	album?: string | null;
	albumArtist?: string | null;
	duration?: number | null;
	trackArt?: string | null;
}

export interface ProcessedSongData {
	artist?: string | null;
	track?: string | null;
	album?: string | null;
	albumArtist?: string | null;
	duration?: number | null;
}

export interface SongMetadata {
	userloved?: boolean;
	userPlayCount?: number;
	trackArtUrl?: string | null;
}

export interface SongData {
	parsed: ParsedSongData;
	processed: ProcessedSongData;
	metadata: SongMetadata;
	flags?: { isCorrectedByUser?: boolean };
	connector?: { label?: string };
}

export interface TabState {
	tabId: number;
	mode: string;
	permanentMode: string;
	song: SongData | null;
}
