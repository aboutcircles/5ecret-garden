import {writable} from "svelte/store";
import {Avatar} from "@circles-sdk/sdk";

/**
 * A store that contains an Avatar instance or undefined.
 */
export const avatar = writable<Avatar | undefined>();