const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Builds a 24×24 `currentColor` SVG icon from path markup. Markup is a static,
 * in-repo constant — never user input.
 */
export function svgIcon(markup: string, size = 16): SVGSVGElement {
	const node = document.createElementNS(SVG_NS, "svg");
	node.setAttribute("viewBox", "0 0 24 24");
	node.setAttribute("width", String(size));
	node.setAttribute("height", String(size));
	node.setAttribute("fill", "currentColor");
	node.setAttribute("aria-hidden", "true");
	node.innerHTML = markup;
	return node;
}

export const ICONS = {
	// gear
	settings:
		'<path d="M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0 0 1.88L2.83 14.52a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/>',
	// heart
	heart:
		'<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>',
	// skip forward
	skip: '<path d="M6 6l8.5 6L6 18V6zm9 0h2v12h-2V6z"/>',
	// pencil
	edit: '<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>',
	// music note
	note: '<path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/>',
	// info circle
	info: '<path d="M11 7h2v2h-2V7zm0 4h2v6h-2v-6zm1-9a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z"/>',
} as const;
