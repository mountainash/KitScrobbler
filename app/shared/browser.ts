import type { ActionIconDetails } from "./action-icon";

/**
 * Browser/extension bridge.
 *
 * `webextension-polyfill` throws when imported outside an extension context, so
 * it is loaded lazily and only when we are actually running inside Safari. This
 * keeps `bun run dev` (a plain browser preview) working.
 *
 * The surface we use is declared structurally so our type-check does not depend
 * on the polyfill's (very large) ambient declarations.
 */
interface StorageArea {
	get(keys?: string): Promise<Record<string, unknown>>;
	set(items: Record<string, unknown>): Promise<void>;
}

export interface BrowserApi {
	action?: {
		setIcon(details: ActionIconDetails): Promise<void> | void;
	};
	runtime: {
		id?: string;
		getManifest(): { name?: string; version?: string };
		openOptionsPage?(): Promise<void>;
		sendMessage(message: unknown): Promise<unknown>;
		onMessage: {
			addListener(listener: (message: unknown, sender: unknown) => void): void;
		};
	};
	tabs: {
		query(queryInfo: {
			active?: boolean;
			currentWindow?: boolean;
		}): Promise<{ id?: number; index?: number }[]>;
		sendMessage(tabId: number, message: unknown): Promise<unknown>;
		create(createProperties: {
			url?: string;
			index?: number;
		}): Promise<unknown>;
	};
	storage: {
		local: StorageArea;
		sync: StorageArea;
	};
}

interface ChromeLike {
	runtime?: {
		id?: string;
		getURL?: (path: string) => string;
	};
}

function chrome(): ChromeLike | undefined {
	return (globalThis as { chrome?: ChromeLike }).chrome;
}

/**
 * Safari and Firefox expose the promise-based API themselves. Preferring it over
 * the polyfill matters in Safari, where `chrome` is only a compatibility shim.
 */
function nativeBrowser(): BrowserApi | undefined {
	return (globalThis as { browser?: BrowserApi }).browser;
}

export function isExtensionContext(): boolean {
	return Boolean(nativeBrowser()?.runtime?.id ?? chrome()?.runtime?.id);
}

/**
 * @returns the `browser` API inside an extension, or `null` in the dev preview.
 */
export async function getBrowser(): Promise<BrowserApi | null> {
	const native = nativeBrowser();
	if (native?.runtime?.id) {
		return native;
	}

	if (!isExtensionContext()) {
		return null;
	}
	const mod = (await import("webextension-polyfill")) as unknown as {
		default: BrowserApi;
	};
	return mod.default;
}

/** Resolves an extension-relative URL (or passes the path through in preview). */
export function extensionUrl(path: string): string {
	const runtime = chrome()?.runtime;
	if (runtime?.getURL) {
		// Kept bound: browsers are free to implement this as a method.
		return runtime.getURL(path);
	}
	// Dev preview: the pages are served from the server root, not from `popup/`.
	return `/${path}`;
}

/**
 * Opens the extension's options page.
 *
 * `runtime.openOptionsPage()` is the API browsers provide for exactly this and
 * the one that needs no host permission, so it is tried first — upstream's tabs
 * approach is the fallback.
 *
 * @param url - Fallback URL, the extension's options page.
 */
export async function openOptionsPage(url: string): Promise<void> {
	const browser = await getBrowser();
	if (!browser) {
		openWithoutApi(url);
		return;
	}

	if (browser.runtime.openOptionsPage) {
		try {
			await browser.runtime.openOptionsPage();
			return;
		} catch (error) {
			console.warn("[kit] runtime.openOptionsPage failed", error);
		}
	}

	await openInNewTab(url);
}

/**
 * Opens a URL in a new tab, next to the current one.
 *
 * A plain anchor does not work from a popup, which is why upstream's
 * `PopupAnchor` does the same thing: it prevents the default and creates the tab
 * through the tabs API. Unlike upstream we keep going after a failed call, so an
 * API Safari refuses still ends up opening the page.
 */
export async function openInNewTab(url: string): Promise<void> {
	const browser = await getBrowser();
	if (!browser) {
		openWithoutApi(url);
		return;
	}

	try {
		const [tab] = await browser.tabs.query({ active: true });
		await browser.tabs.create({ url, index: (tab?.index ?? 0) + 1 });
		return;
	} catch (error) {
		console.warn("[kit] tabs.create with an index failed", error);
	}

	try {
		await browser.tabs.create({ url });
	} catch (error) {
		console.warn("[kit] tabs.create failed", error);
		openWithoutApi(url);
	}
}

/**
 * Last resort for a context with no extension API at all (the dev preview), or
 * where every API call failed. `window.open` can be refused once we are past the
 * click, so navigating is the fallback — the page is what was asked for either
 * way.
 */
function openWithoutApi(url: string): void {
	if (!window.open(url, "_blank")) {
		location.assign(url);
	}
}
