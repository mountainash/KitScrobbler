import { getBrowser } from "./browser";
import type { TabState } from "./types";

/**
 * Storage namespaces, mirroring `@upstream/src/core/storage/browser-storage`.
 * They are re-declared (rather than imported) so this module never has to
 * evaluate upstream's storage runtime outside an extension context.
 */
const STATE_MANAGEMENT = "StateManagement";
const THEME_KEY = "theme";

export type ThemeChoice = "theme-system" | "theme-light" | "theme-dark";

const PREVIEW_TAB: TabState = {
	tabId: -1,
	mode: "Playing",
	permanentMode: "Playing",
	song: null,
};

/**
 * The controller state for the active tab, read straight from the state
 * management storage that upstream's background script writes.
 */
export async function getActiveTab(): Promise<TabState> {
	const browser = await getBrowser();
	if (!browser) {
		return PREVIEW_TAB;
	}

	const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
	const tabId = tab?.id ?? -1;
	const stored = await browser.storage.local.get(STATE_MANAGEMENT);
	const state = stored[STATE_MANAGEMENT] as
		| { activeTabs?: TabState[] }
		| undefined;

	return (
		state?.activeTabs?.find((entry) => entry.tabId === tabId) ?? {
			...PREVIEW_TAB,
			tabId,
		}
	);
}

/** Normalises any stored theme value to one of our three choices. */
export function normalizeTheme(value: unknown): ThemeChoice {
	switch (value) {
		case "theme-light":
		case "theme-high-contrast-light":
			return "theme-light";
		case "theme-dark":
		case "theme-high-contrast-dark":
			return "theme-dark";
		default:
			return "theme-system";
	}
}

export async function getTheme(): Promise<ThemeChoice> {
	const browser = await getBrowser();
	if (!browser) {
		return "theme-system";
	}
	const stored = await browser.storage.sync.get(THEME_KEY);
	return normalizeTheme(stored[THEME_KEY]);
}

/** Persists the theme using upstream's storage key so the background stays in sync. */
export async function setTheme(theme: ThemeChoice): Promise<void> {
	applyTheme(theme);
	const browser = await getBrowser();
	if (!browser) {
		return;
	}
	await browser.storage.sync.set({ [THEME_KEY]: theme });
}

/** Applies the chosen theme to the document via `color-scheme`. */
export function applyTheme(theme: ThemeChoice): void {
	const { documentElement } = document;
	if (theme === "theme-system") {
		delete documentElement.dataset.theme;
		return;
	}
	documentElement.dataset.theme = theme === "theme-dark" ? "dark" : "light";
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
