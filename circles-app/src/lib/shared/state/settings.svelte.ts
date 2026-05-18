import { CirclesStorage } from '$lib/shared/utils/storage';

const storage = CirclesStorage.getInstance();

// Backed by a real reactive signal: an object getter that reads straight
// from localStorage is NOT tracked by Svelte 5 (no underlying $state cell),
// so `{#if settings.advancedMode}` would never re-render on toggle.
let advancedModeState = $state(storage.advancedMode);

export const settings = $state({
	get ring() {
		return storage.rings ?? false;
	},
	set ring(value: boolean) {
		storage.data = { rings: value };
	},
	get legacy() {
		return storage.legacy ?? false;
	},
	set legacy(value: boolean) {
		storage.data = { legacy: value };
	},
	get advancedMode() {
		return advancedModeState;
	},
	set advancedMode(value: boolean) {
		advancedModeState = value;
		storage.data = { advancedMode: value };
	},
});