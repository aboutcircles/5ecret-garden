import { CirclesStorage } from '$lib/shared/utils/storage';

const storage = CirclesStorage.getInstance();

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
		return storage.advancedMode;
	},
	set advancedMode(value: boolean) {
		storage.data = { advancedMode: value };
	},
});