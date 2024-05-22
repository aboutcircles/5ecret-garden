import {writable} from "svelte/store";

export type Sdk = {
}

/**
 * A store that contains the fully configured Circles SDK instance or undefined
 */
export const circles = writable<Sdk | undefined>();