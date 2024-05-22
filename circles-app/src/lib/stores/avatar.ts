import {writable} from "svelte/store";
import type {AvatarInterface} from "@circles-sdk/sdk";

/**
 * A store that contains an Avatar instance or undefined.
 */
export const avatar = writable<AvatarInterface | undefined>();