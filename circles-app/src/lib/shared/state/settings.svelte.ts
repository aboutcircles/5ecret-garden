import { CirclesStorage } from '$lib/utils/storage';

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
	}
});