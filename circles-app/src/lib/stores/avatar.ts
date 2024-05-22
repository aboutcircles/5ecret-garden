import {writable} from "svelte/store";

export type AvatarInterface = {
};

/**
 * A store that contains an Avatar instance or undefined.
 */
export const avatar = writable<AvatarInterface | undefined>();