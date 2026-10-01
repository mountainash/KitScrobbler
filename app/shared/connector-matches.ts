import connectors from "@upstream/src/core/connectors";

/**
 * Works out which connectors can be expressed as extension match patterns.
 *
 * Shared by the build (`scripts/manifest.ts`, which writes
 * `content_scripts.matches`) and the options page, which flags the connectors
 * that cannot work.
 *
 * Upstream declares `<all_urls>`, so its content script runs on every page. We
 * narrow it to the apex domain of each host a connector needs. Connector
 * patterns are written for upstream's *own* matcher (`util/url-match`), not the
 * match-pattern grammar, so some cannot be expressed at all: host wildcards in
 * the middle (`*music.apple.com`), port wildcards (`*32400`) and TLD wildcards
 * (`music.amazon.*`). Only `http`/`https` schemes are ever emitted.
 */

/** Second-level suffixes where the registrable domain is three labels. */
const MULTI_PART_SUFFIXES = new Set([
	"ac.uk",
	"co.in",
	"co.jp",
	"co.kr",
	"co.nz",
	"co.uk",
	"co.za",
	"com.au",
	"com.br",
	"com.cn",
	"com.hk",
	"com.mx",
	"com.sg",
	"com.tr",
	"com.tw",
	"ne.jp",
	"net.au",
	"org.au",
	"org.uk",
	"or.jp",
]);

const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

interface ParsedPattern {
	scheme: string;
	host: string;
	path: string;
}

function parse(pattern: string): ParsedPattern | null {
	const match = pattern.match(/^([a-z*]+):\/\/([^/]*)(\/.*)?$/i);
	if (!match) {
		return null;
	}
	return {
		scheme: match[1].toLowerCase(),
		host: match[2].toLowerCase(),
		path: match[3] ?? "/*",
	};
}

/** The registrable domain of a host, or `null` if it cannot be expressed. */
function apexDomain(host: string): string | null {
	const bare = host
		.replace(/\*/g, "")
		.replace(/:\d+$/, "")
		.replace(/^\.+|\.+$/g, "");

	if (!bare) {
		return null;
	}
	if (IPV4.test(bare)) {
		return bare;
	}
	if (!bare.includes(".")) {
		return null;
	}

	const parts = bare.split(".");
	if (parts.length <= 2) {
		return bare;
	}
	const lastTwo = parts.slice(-2).join(".");
	return MULTI_PART_SUFFIXES.has(lastTwo) ? parts.slice(-3).join(".") : lastTwo;
}

export interface MatchReport {
	patterns: string[];
	/** Path-limited `*`-host patterns we keep (self-hosted servers). */
	wildcardHostPatterns: string[];
	/** Connector ids with at least one pattern that cannot be expressed. */
	partialConnectors: string[];
	/** Connector ids left with no pattern at all, so they can never run. */
	unreachableConnectors: string[];
	/** Connector ids reachable over plain http only. */
	httpOnlyConnectors: string[];
	connectors: number;
	hosts: number;
}

export function connectorMatches(): MatchReport {
	/** apex domain → the schemes seen for it. */
	const schemes = new Map<string, Set<string>>();
	const wildcardHostPatterns = new Set<string>();
	const partialConnectors: string[] = [];
	const unreachableConnectors: string[] = [];
	const httpOnlyConnectors: string[] = [];
	let hosts = 0;

	for (const connector of connectors) {
		const patterns = connector.matches ?? [];
		if (patterns.length === 0) {
			continue;
		}

		const connectorSchemes = new Set<string>();
		let usable = 0;
		let dropped = 0;

		for (const pattern of patterns) {
			const parsed = parse(pattern);
			if (!parsed) {
				dropped += 1;
				continue;
			}

			const { scheme, host, path } = parsed;
			connectorSchemes.add(scheme);

			// A bare `*` host is valid and already path-limited; keep it verbatim.
			if (host === "*") {
				wildcardHostPatterns.add(`${scheme}://*${path}`);
				usable += 1;
				continue;
			}

			// `music.amazon.*` means "any TLD" — there is nothing to narrow to.
			if (host.endsWith(".*")) {
				dropped += 1;
				continue;
			}

			const apex = apexDomain(host);
			if (!apex) {
				dropped += 1;
				continue;
			}

			usable += 1;
			hosts += 1;
			const seen = schemes.get(apex) ?? new Set<string>();
			// A host wildcard widens the scheme, since the exact host is unknown.
			seen.add(host.includes("*") ? "*" : scheme);
			schemes.set(apex, seen);
		}

		if (usable === 0) {
			unreachableConnectors.push(connector.id);
		} else if (dropped > 0) {
			partialConnectors.push(connector.id);
		}
		if (connectorSchemes.has("http") && !connectorSchemes.has("https")) {
			httpOnlyConnectors.push(connector.id);
		}
	}

	const apexPatterns = [...schemes.entries()].map(([apex, seen]) => {
		const scheme =
			seen.has("*") || (seen.has("http") && seen.has("https"))
				? "*"
				: [...seen][0];
		const host = IPV4.test(apex) ? apex : `*.${apex}`;
		return `${scheme}://${host}/*`;
	});

	apexPatterns.sort();
	const wildcards = [...wildcardHostPatterns].sort();

	return {
		patterns: [...apexPatterns, ...wildcards],
		wildcardHostPatterns: wildcards,
		partialConnectors,
		unreachableConnectors,
		httpOnlyConnectors,
		connectors: connectors.length,
		hosts,
	};
}
