type Props = Record<
	string,
	string | number | boolean | EventListener | undefined
>;

/**
 * Minimal hyperscript helper. Keeps the UI dependency-free (no framework) while
 * staying readable.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	props: Props = {},
	...children: (Node | string | number | null | undefined)[]
): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);

	for (const [key, value] of Object.entries(props)) {
		if (value === undefined || value === false) {
			continue;
		}
		if (key === "class") {
			node.className = String(value);
		} else if (key.startsWith("on") && typeof value === "function") {
			node.addEventListener(key.slice(2).toLowerCase(), value);
		} else if (value === true) {
			node.setAttribute(key, "");
		} else {
			node.setAttribute(key, String(value));
		}
	}

	for (const child of children) {
		if (child === null || child === undefined) {
			continue;
		}
		node.append(
			typeof child === "string" || typeof child === "number"
				? document.createTextNode(String(child))
				: child,
		);
	}

	return node;
}

/** Replaces the contents of a container. */
export function mount(container: HTMLElement, ...nodes: Node[]): void {
	container.replaceChildren(...nodes);
}
