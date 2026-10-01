import { getBrowser } from "./browser";

type MessageListener = (message: unknown, sender: unknown) => void;

interface KitMessage {
	type?: string;
	payload?: unknown;
}

/** Sends a message to a content script in the given tab. */
export async function sendToTab(
	tabId: number,
	type: string,
	payload: unknown,
): Promise<unknown> {
	const browser = await getBrowser();
	if (!browser || tabId < 0) {
		return undefined;
	}
	return browser.tabs.sendMessage(tabId, { type, payload });
}

/** Sends a message to the background script. */
export async function sendToBackground(
	type: string,
	payload: unknown,
): Promise<unknown> {
	const browser = await getBrowser();
	if (!browser) {
		return undefined;
	}
	return browser.runtime.sendMessage({ type, payload });
}

/** Subscribes to runtime messages (no-op outside an extension). */
export async function onMessage(
	handler: (message: KitMessage) => void,
): Promise<void> {
	const browser = await getBrowser();
	if (!browser) {
		return;
	}
	const listener: MessageListener = (message) => {
		if (message && typeof message === "object") {
			handler(message as KitMessage);
		}
	};
	browser.runtime.onMessage.addListener(listener);
}
