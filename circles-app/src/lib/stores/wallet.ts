import {writable} from "svelte/store";
import type {SdkContractRunner} from "@circles-sdk/sdk";

/**
 * A store that contains a signer instance or undefined
 */
export const wallet = writable<SdkContractRunner | undefined>();