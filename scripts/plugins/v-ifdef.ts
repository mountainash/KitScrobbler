import { readFileSync } from "node:fs";
import type { BunPlugin, Loader } from "bun";

/**
 * Upstream uses `vite-plugin-conditional-compiler`, whose directives are plain
 * comments:
 *
 * ```ts
 * // #v-ifdef VITE_SAFARI
 * ...
 * // #v-endif
 * ```
 *
 * Without processing, *both* branches survive bundling and the code silently
 * misbehaves (duplicate `return`s, duplicate fields, etc.). We replicate the
 * plugin's behaviour for the Safari target.
 */
const DIRECTIVE = /^\s*\/\/\s*#(v-ifdef-not|v-ifdef|v-else|v-endif)\b(.*)$/;

interface Frame {
	active: boolean;
	parentActive: boolean;
	taken: boolean;
}

/**
 * Evaluates a directive expression. Supports `!`, `&&`, and `||` over bare
 * identifiers — enough for every directive upstream currently uses.
 */
function evaluate(expression: string, defined: ReadonlySet<string>): boolean {
	return expression.split("||").some((orPart) =>
		orPart.split("&&").every((andPart) => {
			const token = andPart.trim();
			if (!token) {
				return false;
			}
			const negated = token.startsWith("!");
			const name = (negated ? token.slice(1) : token).trim();
			const value = defined.has(name);
			return negated ? !value : value;
		}),
	);
}

/**
 * Strips inactive branches. Directives themselves are replaced with blank lines
 * so line numbers (and therefore source maps) stay aligned.
 */
function compile(contents: string, defined: ReadonlySet<string>): string {
	const output: string[] = [];
	const stack: Frame[] = [];
	let active = true;

	for (const line of contents.split("\n")) {
		const match = line.match(DIRECTIVE);
		if (!match) {
			output.push(active ? line : "");
			continue;
		}

		const kind = match[1];
		const expression = (match[2] ?? "").trim();

		switch (kind) {
			case "v-endif": {
				active = stack.pop()?.parentActive ?? true;
				break;
			}
			case "v-ifdef":
			case "v-ifdef-not": {
				const parentActive = active;
				let condition = evaluate(expression, defined);
				if (kind === "v-ifdef-not") {
					condition = !condition;
				}
				const frame: Frame = {
					active: parentActive && condition,
					parentActive,
					taken: condition,
				};
				stack.push(frame);
				active = frame.active;
				break;
			}
			case "v-else": {
				const frame = stack.at(-1);
				if (frame) {
					frame.active = frame.parentActive && !frame.taken;
					frame.taken = true;
					active = frame.active;
				}
				break;
			}
			default:
				break;
		}

		output.push("");
	}

	return output.join("\n");
}

function loaderFor(path: string): Loader {
	if (path.endsWith(".tsx")) {
		return "tsx";
	}
	if (path.endsWith(".ts") || path.endsWith(".mts") || path.endsWith(".cts")) {
		return "ts";
	}
	return "jsx";
}

/**
 * A Bun.build plugin that processes upstream's `#v-ifdef` directives.
 *
 * @param defines - identifiers that are considered defined for this build.
 */
export function vIfdef(defines: readonly string[]): BunPlugin {
	const defined = new Set(defines);

	return {
		name: "kit-v-ifdef",
		setup(build) {
			build.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, (args) => {
				const text = readFileSync(args.path, "utf8");
				if (!text.includes("#v-ifdef") && !text.includes("#v-endif")) {
					return undefined;
				}
				return {
					contents: compile(text, defined),
					loader: loaderFor(args.path),
				};
			});
		},
	};
}
