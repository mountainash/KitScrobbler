/**
 * Module-resolution hook that points upstream's `canvas` import at our stub.
 *
 * Registered by `upstream-driver.ts` before it imports upstream's Vite configs.
 */
const STUB = new URL("./canvas-stub.mjs", import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
	if (specifier === "canvas") {
		return { url: STUB, shortCircuit: true };
	}
	return nextResolve(specifier, context);
}
