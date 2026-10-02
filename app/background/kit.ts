import {
	type ActionIconDetails,
	withKitActionIcon,
} from "@kit/shared/action-icon";
import { getBrowser } from "@kit/shared/browser";

/**
 * Kit Scrobbler's toolbar icon.
 *
 * Upstream drives the action icon from the controller mode, naming each state
 * `icons/action_<mode>_<size>_<theme>.png` — artwork its canvas pipeline
 * generated. Kit ships two icons instead, so we wrap `action.setIcon` and swap
 * the artwork for the mode upstream has already decided on: recording while a
 * track plays, resting otherwise.
 *
 * Reading upstream's decision rather than re-deriving it keeps us in step with
 * the controller (including per-tab modes) without touching the submodule.
 */
async function hookActionIcon(): Promise<void> {
	const browser = await getBrowser();
	const action = browser?.action;
	if (!action) {
		return;
	}

	const setIcon = action.setIcon.bind(action);
	try {
		action.setIcon = (details: ActionIconDetails) =>
			setIcon(withKitActionIcon(details));
	} catch (error) {
		// A sealed API object cannot be wrapped, so the manifest's icon stays.
		console.warn("[kit] could not hook action.setIcon", error);
	}
}

void hookActionIcon();
