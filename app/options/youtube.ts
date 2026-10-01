import { el, mount, switchControl } from "@kit/shared/dom";
import { type UpstreamOptions, upstreamOptions } from "@kit/shared/upstream";
import type { ConnectorOptions } from "@upstream/src/core/storage/options";

/** Upstream keys connector options by the connector's *label*, not its id. */
const CONNECTOR = "YouTube";

type YouTubeOptionKey = keyof ConnectorOptions["YouTube"];

/**
 * Upstream's "connector options" screen only covers YouTube, and these are its
 * four settings. The keys are typed against upstream's
 * `ConnectorOptions["YouTube"]`, so a rename there fails our typecheck instead of
 * writing to a key that nothing reads; the wording comes from its `_locales`
 * messages.
 */
const SETTINGS: { key: YouTubeOptionKey; label: string; hint: string }[] = [
	{
		key: "scrobbleMusicRecognisedOnly",
		label: "Scrobble only videos that are recognised by YouTube Music as music",
		hint: "Ignore videos that are not recognised by YouTube Music as music",
	},
	{
		key: "enableGetTrackInfoFromYtMusic",
		label: "Use YouTube Music to get track info",
		hint: "If disabled, falls back to the video title and description",
	},
	{
		key: "scrobbleMusicOnly",
		label: 'Scrobble videos from "Music" category',
		hint: `Ignore videos that are not in "Music" category`,
	},
	{
		key: "scrobbleEntertainmentOnly",
		label: 'Scrobble videos from "Entertainment" category',
		hint: `Ignore videos that are not in "Entertainment" category`,
	},
];

/**
 * The YouTube screen: the four `ConnectorOptions.YouTube` settings, read and
 * written through upstream's own `getConnectorOption` / `setConnectorOption`, so
 * `connectors/youtube.ts` picks them up exactly as it does upstream.
 */
export function youtubeSection(): HTMLElement {
	let values: ConnectorOptions["YouTube"] = {
		scrobbleMusicRecognisedOnly: false,
		enableGetTrackInfoFromYtMusic: false,
		scrobbleMusicOnly: false,
		scrobbleEntertainmentOnly: false,
	};
	let options: UpstreamOptions | null = null;

	const list = el("ul", { class: "list" });

	const section = el(
		"section",
		{},
		el("h2", { class: "content__heading" }, "YouTube"),
		el(
			"p",
			{ class: "content__subtitle" },
			"YouTube-specific scrobbling settings.",
		),
		list,
		el(
			"p",
			{ class: "content__note" },
			"If you turn off both category options, Kit Scrobbler scrobbles YouTube videos from all categories.",
		),
	);

	function set(key: YouTubeOptionKey, value: boolean): void {
		values = { ...values, [key]: value };
		void options?.setConnectorOption(CONNECTOR, key, value);
	}

	function render(): void {
		mount(
			list,
			...SETTINGS.map((setting) =>
				el(
					"li",
					{ class: "list-row" },
					el(
						"div",
						{ class: "list-row__label" },
						el("div", { class: "list-row__title" }, setting.label),
						el("div", { class: "list-row__subtitle" }, setting.hint),
					),
					switchControl(setting.label, values[setting.key], (checked) =>
						set(setting.key, checked),
					),
				),
			),
		);
	}

	render();

	void (async () => {
		options = await upstreamOptions();
		let stored = await options?.readConnectorOptions();
		if (options && !stored?.YouTube) {
			// Upstream seeds its defaults asynchronously when its options module is
			// first imported, so a first read can land before the write.
			await new Promise((resolve) => setTimeout(resolve, 250));
			stored = await options.readConnectorOptions();
		}
		if (stored?.YouTube) {
			values = { ...values, ...stored.YouTube };
		}
		render();
	})();

	return section;
}
