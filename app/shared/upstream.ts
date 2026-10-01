/**
 * Lazy access to upstream runtime modules.
 *
 * Upstream types are imported directly from the submodule (`import type`), so no
 * upstream shape is re-declared in this project.
 *
 * Runtime code that reaches `webextension-polyfill` is imported *dynamically*,
 * because the polyfill throws at module-evaluation time outside an extension —
 * which would break `bun run dev`. Outside an extension these helpers return
 * `null` and the pages fall back to a tiny preview.
 */
import type { ConnectorMeta } from "@upstream/src/core/connectors";
import type {
	ConnectorOptions,
	ConnectorsOverrideOptions,
	ConnectorsOverrideOptionValues,
	GlobalOptions,
} from "@upstream/src/core/storage/options";
import type { ManagerTab } from "@upstream/src/core/storage/wrapper";
import { getBrowser, isExtensionContext } from "./browser";

export type {
	Scrobbler,
	ScrobblerLabel,
} from "@upstream/src/core/object/scrobble-service";
export type { CloneableSong } from "@upstream/src/core/object/song";
export type { ModifiedTheme } from "@upstream/src/theme/themes";
export type { ManagerTab };

export type UpstreamCommunication =
	typeof import("@upstream/src/util/communication");
export type UpstreamThemes = typeof import("@upstream/src/theme/themes");
export type UpstreamClonedSong =
	typeof import("@upstream/src/core/object/cloned-song").default;
export type UpstreamScrobbleService =
	typeof import("@upstream/src/core/object/scrobble-service").default;
export type UpstreamSavedEdits =
	typeof import("@upstream/src/core/storage/saved-edits").default;

/** Preview-only stand-in used when there is no extension context. */
export const PREVIEW_TAB: ManagerTab = {
	tabId: -1,
	mode: "Playing",
	permanentMode: "Playing",
	song: null,
};

/** Upstream's own "which tab is this popup showing" logic. */
export async function getCurrentTab(): Promise<ManagerTab> {
	if (!isExtensionContext()) {
		return PREVIEW_TAB;
	}
	const { getCurrentTab } = await import("@upstream/src/core/background/util");
	return getCurrentTab();
}

/** Upstream's `ClonedSong`, which exposes the song accessors the UI renders. */
export async function loadClonedSong(): Promise<UpstreamClonedSong | null> {
	if (!isExtensionContext()) {
		return null;
	}
	const { default: ClonedSong } = await import(
		"@upstream/src/core/object/cloned-song"
	);
	return ClonedSong;
}

/** Upstream's typed message senders. */
export async function upstreamCommunication(): Promise<UpstreamCommunication | null> {
	if (!isExtensionContext()) {
		return null;
	}
	return import("@upstream/src/util/communication");
}

/** Upstream's theme storage + DOM handling. */
export async function upstreamThemes(): Promise<UpstreamThemes | null> {
	if (!isExtensionContext()) {
		return null;
	}
	return import("@upstream/src/theme/themes");
}

/** Upstream's scrobble service: sessions, auth URLs and sign-out. */
export async function upstreamScrobbleService(): Promise<UpstreamScrobbleService | null> {
	if (!isExtensionContext()) {
		return null;
	}
	const { default: scrobbleService } = await import(
		"@upstream/src/core/object/scrobble-service"
	);
	return scrobbleService;
}

/** Upstream's saved metadata edits (`saveSongInfo`). */
export async function upstreamSavedEdits(): Promise<UpstreamSavedEdits | null> {
	if (!isExtensionContext()) {
		return null;
	}
	const { default: savedEdits } = await import(
		"@upstream/src/core/storage/saved-edits"
	);
	return savedEdits;
}

/** A per-connector override key from upstream's `ConnectorsOverrideOptionValues`. */
export type OverrideKey = keyof ConnectorsOverrideOptionValues;

/** The connector settings from upstream's option storages. */
export interface UpstreamOptions {
	read(): Promise<GlobalOptions | null>;
	readOverrides(): Promise<ConnectorsOverrideOptions | null>;
	readConnectorOptions(): Promise<ConnectorOptions | null>;
	setConnectorEnabled(
		connector: ConnectorMeta,
		enabled: boolean,
	): Promise<void>;
	setAllConnectorsEnabled(enabled: boolean): Promise<void>;
	setOverride(
		connectorId: string,
		key: OverrideKey,
		value: boolean | undefined,
	): Promise<void>;
	/** Writes one connector-specific option (e.g. `YouTube` / `scrobbleMusicOnly`). */
	setConnectorOption(
		connector: string,
		key: string,
		value: boolean,
	): Promise<void>;
}

/**
 * Upstream's options, through its own helpers.
 *
 * Enabled connectors are the ones *absent* from `disabledConnectors`; override
 * options live keyed by connector id, where an absent key means "inherit the
 * global setting". Both are exactly what upstream's own options page reads and
 * writes, so the background and content scripts honour them unchanged.
 */
export async function upstreamOptions(): Promise<UpstreamOptions | null> {
	if (!isExtensionContext()) {
		return null;
	}

	const [options, browserStorage] = await Promise.all([
		import("@upstream/src/core/storage/options"),
		import("@upstream/src/core/storage/browser-storage"),
	]);

	return {
		read: () => browserStorage.getStorage(browserStorage.OPTIONS).get(),
		readOverrides: () =>
			browserStorage
				.getStorage(browserStorage.CONNECTORS_OVERRIDE_OPTIONS)
				.get(),
		readConnectorOptions: () =>
			browserStorage.getStorage(browserStorage.CONNECTORS_OPTIONS).get(),
		setConnectorEnabled: options.setConnectorEnabled,
		setAllConnectorsEnabled: options.setAllConnectorsEnabled,
		setOverride: (connectorId, key, value) =>
			options.setConnectorOverrideOption(connectorId, key, value),
		setConnectorOption: (connector, key, value) =>
			options.setConnectorOption(connector, key, value),
	};
}

export interface ExtensionInfo {
	name: string;
	version: string;
}

export async function getExtensionInfo(): Promise<ExtensionInfo> {
	const browser = await getBrowser();
	if (!browser) {
		return { name: "Kit Scrobbler", version: "dev" };
	}
	const manifest = browser.runtime.getManifest();
	return {
		name: manifest.name ?? "Kit Scrobbler",
		version: manifest.version ?? "0",
	};
}

/**
 * Applies the theme class when upstream's theme module is unavailable (preview
 * only). Upstream owns this in an extension via `updateTheme`/`initializeThemes`.
 */
export function applyPreviewTheme(theme: string): void {
	const resolved =
		theme === "theme-system"
			? matchMedia("(prefers-color-scheme: dark)").matches
				? "theme-dark"
				: "theme-light"
			: theme;
	document.body.className = "";
	document.body.classList.add(resolved);
}
