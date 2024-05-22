import type {AbstractSigner} from "ethers";
import {writable} from "svelte/store";

/**
 * A store that contains a signer instance or undefined
 */
export const wallet = writable<AbstractSigner|undefined>();