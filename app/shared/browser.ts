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
	runtime: {
		getManifest(): { name?: string; version?: string };
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

export function isExtensionContext(): boolean {
	return Boolean(chrome()?.runtime?.id);
}

/**
 * @returns the `browser` API inside an extension, or `null` in the dev preview.
 */
export async function getBrowser(): Promise<BrowserApi | null> {
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
	const getURL = chrome()?.runtime?.getURL;
	return getURL ? getURL(path) : path;
}

/**
 * Opens a URL in a new tab, next to the current one.
 *
 * A plain anchor does not work from a popup, which is why upstream's
 * `PopupAnchor` does the same thing: it prevents the default and creates the tab
 * through the tabs API.
 */
export async function openInNewTab(url: string): Promise<void> {
	const browser = await getBrowser();
	if (!browser) {
		window.open(url, "_blank");
		return;
	}

	try {
		const [tab] = await browser.tabs.query({ active: true });
		await browser.tabs.create({ url, index: (tab?.index ?? 0) + 1 });
	} catch {
		await browser.tabs.create({ url });
	}
}
