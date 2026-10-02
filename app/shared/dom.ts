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

/**
 * A native switch — Safari renders `<input type="checkbox" switch>` as the
 * iOS/macOS toggle, so there is no custom control markup.
 */
export function switchControl(
	label: string,
	checked: boolean,
	onChange: (checked: boolean) => void,
	disabled = false,
): HTMLInputElement {
	const input = el("input", {
		type: "checkbox",
		switch: true,
		checked,
		disabled,
		"aria-label": label,
	});

	if (!disabled) {
		input.addEventListener("change", () => onChange(input.checked));
	}

	return input;
}

export interface SegmentedOption<T extends string> {
	value: T;
	label: string;
}

/**
 * A segmented control for a small set of mutually exclusive values.
 *
 * Keyboard accessible following the WAI-ARIA radio group pattern: the group is a
 * single tab stop (roving `tabindex`), the arrow keys move and select, and
 * Home/End jump to the ends. Selection is applied to the DOM here, so callers do
 * not have to re-render.
 *
 * @param label - Accessible name for the group.
 */
export function segmentedControl<T extends string>(
	options: SegmentedOption<T>[],
	current: T,
	onSelect: (value: T) => void,
	label?: string,
): HTMLElement {
	const group = el("div", {
		class: "segmented",
		role: "radiogroup",
		"aria-label": label,
	});

	// Fall back to the first option if `current` is not one of them, so the group
	// always has exactly one tab stop.
	let selected = Math.max(
		0,
		options.findIndex((option) => option.value === current),
	);

	const items = options.map((option, index) => {
		const item = el(
			"button",
			{
				class: "segmented__item",
				type: "button",
				role: "radio",
				tabindex: index === selected ? "0" : "-1",
			},
			option.label,
		);
		item.addEventListener("click", () => select(index));
		group.append(item);
		return item;
	});

	function select(index: number): void {
		selected = index;
		items.forEach((item, itemIndex) => {
			item.setAttribute("aria-checked", itemIndex === index ? "true" : "false");
			item.tabIndex = itemIndex === index ? 0 : -1;
		});
		items[index]?.focus();
		onSelect(options[index].value);
	}

	function move(step: number): void {
		select(Math.min(items.length - 1, Math.max(0, selected + step)));
	}

	group.addEventListener("keydown", (event) => {
		if (!(event instanceof KeyboardEvent)) {
			return;
		}

		switch (event.key) {
			case "ArrowRight":
			case "ArrowDown":
				event.preventDefault();
				move(1);
				break;
			case "ArrowLeft":
			case "ArrowUp":
				event.preventDefault();
				move(-1);
				break;
			case "Home":
				event.preventDefault();
				select(0);
				break;
			case "End":
				event.preventDefault();
				select(items.length - 1);
				break;
			default:
				break;
		}
	});

	// Reflect the initial selection.
	items.forEach((item, index) => {
		item.setAttribute("aria-checked", index === selected ? "true" : "false");
	});

	return group;
}
